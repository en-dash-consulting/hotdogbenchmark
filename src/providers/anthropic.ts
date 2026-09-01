/**
 * Anthropic — the reference adapter.
 *
 * **Read this one first.** The other six are variations on it. The How It Works
 * page on the site excerpts this file directly, so it is written to be read:
 * linear, short, and commented wherever the reason for a line is not obvious
 * from the line.
 *
 * The whole job of an adapter, in order:
 *
 *   1. Turn a `CompleteRequest` into this vendor's request shape.
 *   2. Send it through `fetchWithPolicy`, so timeouts and retries are the same
 *      as every other provider's.
 *   3. Read the streaming response, marking the first token for `ttfbMs`.
 *   4. Map the vendor's usage payload onto the shared `Usage` shape.
 *   5. Let any failure arrive as a `ProviderError`.
 *
 * Note what is absent: no model id (that comes from `models.json`), no API key
 * from the environment (it comes from `AdapterContext`), no retry logic, no
 * pricing. An adapter that grew any of those would be duplicating something.
 *
 * Wire format verified against https://platform.claude.com/docs/en/build-with-claude/streaming
 * on 2026-09-01.
 */
import { fetchWithPolicy, type RetryPolicy } from './http.ts'
import { readSseJson } from './sse.ts'
import { normalizeUsage, startMeasurement } from './timing.ts'
import { ProviderError, toProviderError } from './types.ts'
import type { AdapterContext, CompleteRequest, CompleteResult, ProviderAdapter } from './types.ts'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'

/** Pinned rather than tracking latest: a version bump should be a deliberate edit. */
const API_VERSION = '2023-06-01'

/** The subset of Anthropic's stream events this adapter cares about. */
interface AnthropicEvent {
  type: string
  message?: { usage?: AnthropicUsage }
  delta?: { type?: string; text?: string }
  usage?: AnthropicUsage
  error?: { type?: string; message?: string }
}

interface AnthropicUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export function createAnthropicAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return {
    id: 'anthropic',
    displayName: 'Anthropic',

    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      const measurement = startMeasurement()

      try {
        const response = await fetchWithPolicy(
          ENDPOINT,
          {
            method: 'POST',
            headers: {
              // Anthropic authenticates with x-api-key, not a bearer token.
              'x-api-key': context.credentials.apiKey,
              'anthropic-version': API_VERSION,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: request.modelId,
              max_tokens: request.maxOutputTokens,
              messages: [{ role: 'user', content: request.prompt }],
              // Streaming is what makes ttfbMs measurable. Without it there is
              // no "first token" to observe — only a complete response.
              stream: true,
              ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
            }),
          },
          { fetch: context.fetch, signal: context.signal },
          policy,
        )

        let text = ''
        let usage: AnthropicUsage = {}

        // #region anthropic-stream
        for await (const event of readSseJson<AnthropicEvent>(response)) {
          switch (event.type) {
            case 'message_start':
              // Carries input_tokens and the cache counts. Output tokens here
              // are a running start, superseded by message_delta below.
              usage = { ...usage, ...event.message?.usage }
              break

            case 'content_block_delta':
              if (event.delta?.type === 'text_delta' && event.delta.text) {
                // The first content token: this is the moment ttfbMs measures.
                // Marking is idempotent, so calling it per delta is fine.
                measurement.markFirstToken()
                context.onFirstToken?.()
                text += event.delta.text
              }
              break

            case 'message_delta':
              // Anthropic documents these counts as *cumulative*, so the last
              // message_delta holds the authoritative totals. Merging rather
              // than replacing keeps input_tokens from message_start when a
              // delta omits it.
              usage = { ...usage, ...event.usage }
              break

            case 'error':
              // An error can arrive mid-stream, after a 200. The HTTP layer has
              // already returned by then, so it has to be caught here.
              throw new ProviderError(
                'server',
                `Anthropic stream error: ${event.error?.message ?? event.error?.type ?? 'unknown'}`,
              )
          }
        }
        // #endregion anthropic-stream

        if (usage.input_tokens === undefined || usage.output_tokens === undefined) {
          // A 200 whose body did not carry usage is a response we cannot
          // interpret. bad_response rather than server: retrying gets the same
          // thing back.
          throw new ProviderError('bad_response', 'Anthropic response contained no usage data')
        }

        return {
          text,
          usage: normalizeUsage({
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            // Cache reads are billed at a fraction of the input rate and are
            // common here, because the same short prompt is sent nine times a
            // week. Surfaced separately rather than folded into inputTokens.
            cachedInputTokens: usage.cache_read_input_tokens ?? null,
            // Anthropic reports no separate reasoning-token count on this API;
            // thinking tokens, when a model produces them, are inside
            // output_tokens. Null means "not reported", never zero.
            reasoningTokens: null,
          }),
          timing: measurement.finish(),
          raw: usage,
        }
      } catch (cause) {
        throw toProviderError(cause, 'Anthropic request failed')
      }
    },
  }
}
