/**
 * Google Gemini.
 *
 * The most structurally different of the seven. Gemini has no `messages` array
 * and no `usage` object — it has `contents` with `parts`, and `usageMetadata`.
 * Streaming is a separate method on the URL rather than a body flag, and needs
 * `?alt=sse` to produce server-sent events instead of a JSON array.
 *
 * ## Safety filtering has to be handled, not ignored
 *
 * Gemini can return HTTP 200 with no candidate content at all when a response
 * is filtered. That is a success as far as the HTTP layer is concerned, and it
 * would otherwise land in the run file as a model that answered with an empty
 * string. It is mapped to `bad_response` instead, so the report shows an error
 * state rather than silently recording an empty answer as data.
 *
 * ## Where the key goes
 *
 * In the `x-goog-api-key` header, never the `?key=` query parameter Gemini also
 * accepts. A key in a URL ends up in logs, and `safeUrl()` strips query strings
 * precisely because that is such an easy mistake to make.
 *
 * Model id verified on 2026-09-01 against https://ai.google.dev/gemini-api/docs/models.
 * Fixtures are authored to the documented shape rather than captured live, as
 * no Google key was available; replace them with a real capture via
 * `npm run bench:record -- --provider gemini`.
 */
import { fetchWithPolicy, type RetryPolicy } from './http.ts'
import { readSseJson } from './sse.ts'
import { normalizeUsage, startMeasurement } from './timing.ts'
import { ProviderError, toProviderError } from './types.ts'
import type { AdapterContext, CompleteRequest, CompleteResult, ProviderAdapter } from './types.ts'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiUsageMetadata {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
  /** Tokens spent on internal reasoning, for models that do it. */
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
}

interface GeminiChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: GeminiUsageMetadata
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string }
}

export function createGeminiAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return {
    id: 'gemini',
    displayName: 'Google Gemini',

    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      const measurement = startMeasurement()
      // Streaming is a different method name, and alt=sse is what makes the
      // response server-sent events rather than a streamed JSON array.
      const url = `${BASE_URL}/${encodeURIComponent(request.modelId)}:streamGenerateContent?alt=sse`

      try {
        const response = await fetchWithPolicy(
          url,
          {
            method: 'POST',
            headers: {
              'x-goog-api-key': context.credentials.apiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              // Gemini's system prompt is a contents-shaped object rather than
              // a bare string: parts, not text.
              ...(request.systemPrompt === undefined
                ? {}
                : { systemInstruction: { parts: [{ text: request.systemPrompt }] } }),
              contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
              generationConfig: {
                maxOutputTokens: request.maxOutputTokens,
                ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
              },
            }),
          },
          { fetch: context.fetch, signal: context.signal },
          policy,
        )

        let text = ''
        let usage: GeminiUsageMetadata | null = null
        let blockReason: string | null = null

        for await (const chunk of readSseJson<GeminiChunk>(response)) {
          if (chunk.error) {
            throw new ProviderError(
              'server',
              `Gemini stream error: ${chunk.error.message ?? chunk.error.status ?? 'unknown'}`,
            )
          }
          if (chunk.promptFeedback?.blockReason) {
            blockReason = chunk.promptFeedback.blockReason
          }
          for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
            if (part.text) {
              measurement.markFirstToken()
              context.onFirstToken?.()
              text += part.text
            }
          }
          // usageMetadata repeats on chunks; the last one is the complete count.
          if (chunk.usageMetadata) usage = chunk.usageMetadata
        }

        if (text === '') {
          // A 200 with no text is a filtered or empty response. Recording it as
          // an empty answer would put a silent blank into the archive.
          throw new ProviderError(
            'bad_response',
            blockReason
              ? `Gemini returned no content (blocked: ${blockReason})`
              : 'Gemini returned no candidate content',
          )
        }

        if (
          !usage ||
          usage.promptTokenCount === undefined ||
          usage.candidatesTokenCount === undefined
        ) {
          throw new ProviderError('bad_response', 'Gemini response contained no usageMetadata')
        }

        return {
          text,
          usage: normalizeUsage({
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            // Gemini's own total includes thoughts tokens, which
            // candidatesTokenCount does not — so the vendor total is kept
            // rather than derived. See docs/usage-normalization.md.
            totalTokens: usage.totalTokenCount ?? null,
            reasoningTokens: usage.thoughtsTokenCount ?? null,
            cachedInputTokens: usage.cachedContentTokenCount ?? null,
          }),
          timing: measurement.finish(),
          raw: usage,
        }
      } catch (cause) {
        throw toProviderError(cause, 'Gemini request failed')
      }
    },
  }
}
