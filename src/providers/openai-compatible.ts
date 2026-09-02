/**
 * The shared body of every "OpenAI-compatible" adapter.
 *
 * Four of the seven vendors here expose `POST /chat/completions` with bearer
 * auth and OpenAI's streaming chunk format: xAI, Mistral, DeepSeek, and Meta
 * Llama via Together AI. Writing that four times would be four chances to get
 * SSE framing subtly wrong, so it is written once and each adapter supplies
 * only what genuinely differs — a base URL, and occasionally a vendor-specific
 * usage field.
 *
 * "Compatible" is doing some work in that phrase. The *request* is uniform; the
 * `usage` object is where vendors diverge, which is why `extractUsage` is a
 * hook rather than a fixed mapping.
 *
 * Adapters that are *not* built on this: Anthropic (its own Messages API),
 * Gemini (its own generateContent API), and OpenAI itself, which has moved its
 * flagship to the Responses API.
 */
import { fetchWithPolicy, type RetryPolicy } from './http.ts'
import { readSseJson } from './sse.ts'
import { normalizeUsage, startMeasurement } from './timing.ts'
import { ProviderError, toProviderError } from './types.ts'
import type { AdapterContext, CompleteRequest, CompleteResult, ProviderAdapter } from './types.ts'
import type { UsageParts } from './timing.ts'

/** The usage object as OpenAI-compatible APIs report it, plus vendor extras. */
export interface OpenAiCompatibleUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number }
  completion_tokens_details?: { reasoning_tokens?: number }
  /** DeepSeek reports cache hits and misses as separate top-level fields. */
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
}

interface ChatChunk {
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>
  usage?: OpenAiCompatibleUsage | null
  error?: { message?: string; type?: string }
}

export interface OpenAiCompatibleOptions {
  /** Provider id, matching `models.json`. */
  id: string
  displayName: string
  /** Base URL up to but not including `/chat/completions`. */
  baseUrl: string
  /**
   * Map the vendor's usage object onto the shared shape.
   *
   * Defaults to the standard OpenAI field names. Vendors that add their own
   * fields (DeepSeek's cache hit/miss counters) override this.
   */
  extractUsage?: (usage: OpenAiCompatibleUsage) => UsageParts
  /** Extra fields merged into the request body. */
  extraBody?: Record<string, unknown>
  /** Extra headers merged into the request. */
  extraHeaders?: Record<string, string>
  policy?: Partial<RetryPolicy>
}

/** The default mapping, which four of these vendors follow exactly. */
export function defaultExtractUsage(usage: OpenAiCompatibleUsage): UsageParts {
  return {
    inputTokens: usage.prompt_tokens ?? Number.NaN,
    outputTokens: usage.completion_tokens ?? Number.NaN,
    totalTokens: usage.total_tokens ?? null,
    // Both nullable fields stay null when absent. Absent means "this vendor
    // does not report it", which is not the same as zero.
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
  }
}

/** Build an adapter for a vendor speaking OpenAI's chat-completions dialect. */
export function createOpenAiCompatibleAdapter(options: OpenAiCompatibleOptions): ProviderAdapter {
  const extractUsage = options.extractUsage ?? defaultExtractUsage
  const endpoint = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`

  return {
    id: options.id,
    displayName: options.displayName,

    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      const measurement = startMeasurement()

      try {
        const response = await fetchWithPolicy(
          endpoint,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${context.credentials.apiKey}`,
              'content-type': 'application/json',
              ...options.extraHeaders,
            },
            body: JSON.stringify({
              model: request.modelId,
              // The chat-completions dialect carries a system prompt as the
              // first message. Handled here once, so four adapters get it for
              // free and none of them can do it differently.
              messages: [
                ...(request.systemPrompt === undefined
                  ? []
                  : [{ role: 'system', content: request.systemPrompt }]),
                { role: 'user', content: request.prompt },
              ],
              max_tokens: request.maxOutputTokens,
              stream: true,
              // Without this, a streamed OpenAI-style response carries no usage
              // at all — the token counts simply never arrive.
              stream_options: { include_usage: true },
              ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
              ...options.extraBody,
            }),
          },
          { fetch: context.fetch, signal: context.signal },
          options.policy ?? {},
        )

        let text = ''
        let usage: OpenAiCompatibleUsage | null = null

        for await (const chunk of readSseJson<ChatChunk>(response)) {
          if (chunk.error) {
            throw new ProviderError(
              'server',
              `${options.displayName} stream error: ${chunk.error.message ?? chunk.error.type ?? 'unknown'}`,
            )
          }
          const content = chunk.choices?.[0]?.delta?.content
          if (content) {
            measurement.markFirstToken()
            context.onFirstToken?.()
            text += content
          }
          // Usage arrives in a final chunk whose `choices` array is empty.
          if (chunk.usage) usage = chunk.usage
        }

        if (!usage) {
          throw new ProviderError(
            'bad_response',
            `${options.displayName} response contained no usage data`,
          )
        }

        const parts = extractUsage(usage)
        if (!Number.isFinite(parts.inputTokens) || !Number.isFinite(parts.outputTokens)) {
          throw new ProviderError(
            'bad_response',
            `${options.displayName} usage payload was missing token counts`,
          )
        }

        return {
          text,
          usage: normalizeUsage(parts),
          timing: measurement.finish(),
          raw: usage,
        }
      } catch (cause) {
        throw toProviderError(cause, `${options.displayName} request failed`)
      }
    },
  }
}
