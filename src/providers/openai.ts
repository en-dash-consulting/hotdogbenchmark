/**
 * OpenAI.
 *
 * Structured like the Anthropic reference adapter, but against the **Responses
 * API** rather than chat completions, because that is where OpenAI's current
 * flagship lives. That is also why this one does not reuse
 * `openai-compatible.ts` even though it is the vendor that dialect is named
 * after: four other providers speak OpenAI's *older* chat-completions format,
 * while OpenAI itself has moved on.
 *
 * Streaming event names and usage field names follow the Responses API's
 * documented shape:
 *
 *   response.output_text.delta   → { delta: "..." }
 *   response.completed           → { response: { usage: { ... } } }
 *
 * Model id verified on 2026-09-01 against
 * https://developers.openai.com/api/docs/models/gpt-5.6-sol.
 *
 * The committed fixtures for this adapter are **authored to the documented
 * shape, not captured from a live call** — no OpenAI key was available when it
 * was written. Anyone with a key should replace them with a real capture via
 * `npm run bench:record -- --provider openai`, and correct this note.
 */
import { fetchWithPolicy, type RetryPolicy } from './http.ts'
import { readSseJson } from './sse.ts'
import { normalizeUsage, startMeasurement } from './timing.ts'
import { ProviderError, toProviderError } from './types.ts'
import type { AdapterContext, CompleteRequest, CompleteResult, ProviderAdapter } from './types.ts'

const ENDPOINT = 'https://api.openai.com/v1/responses'

interface ResponsesUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
  output_tokens_details?: { reasoning_tokens?: number }
}

interface ResponsesEvent {
  type: string
  delta?: string
  response?: { usage?: ResponsesUsage; output_text?: string }
  error?: { message?: string; type?: string }
}

export function createOpenAiAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return {
    id: 'openai',
    displayName: 'OpenAI',

    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      const measurement = startMeasurement()

      try {
        const response = await fetchWithPolicy(
          ENDPOINT,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${context.credentials.apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              input: request.prompt,
              // The Responses API caps generated tokens under a different name
              // than chat completions did.
              max_output_tokens: request.maxOutputTokens,
              stream: true,
              ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
            }),
          },
          { fetch: context.fetch, signal: context.signal },
          policy,
        )

        let text = ''
        let usage: ResponsesUsage | null = null

        for await (const event of readSseJson<ResponsesEvent>(response)) {
          switch (event.type) {
            case 'response.output_text.delta':
              if (event.delta) {
                measurement.markFirstToken()
                context.onFirstToken?.()
                text += event.delta
              }
              break

            case 'response.completed':
              // Usage arrives once, on the terminal event, attached to the
              // completed response rather than to the event itself.
              usage = event.response?.usage ?? null
              break

            case 'response.failed':
            case 'error':
              throw new ProviderError(
                'server',
                `OpenAI stream error: ${event.error?.message ?? event.error?.type ?? 'unknown'}`,
              )
          }
        }

        if (!usage || usage.input_tokens === undefined || usage.output_tokens === undefined) {
          throw new ProviderError('bad_response', 'OpenAI response contained no usage data')
        }

        return {
          text,
          usage: normalizeUsage({
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            totalTokens: usage.total_tokens ?? null,
            // OpenAI counts reasoning tokens *inside* output_tokens on this
            // API, and also breaks them out here. Surfacing both means a reader
            // can see why a one-word answer cost several hundred tokens.
            reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? null,
            cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? null,
          }),
          timing: measurement.finish(),
          raw: usage,
        }
      } catch (cause) {
        throw toProviderError(cause, 'OpenAI request failed')
      }
    },
  }
}
