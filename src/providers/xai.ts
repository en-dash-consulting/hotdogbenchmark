/**
 * xAI (Grok).
 *
 * A thin file over the shared OpenAI-compatible helper: xAI's chat API matches
 * OpenAI's request and streaming-chunk format closely enough that the only
 * genuinely xAI-specific thing here is the base URL.
 *
 * Model ids and prices verified on 2026-09-01 against xAI's live
 * `GET /v1/language-models` endpoint, which is more authoritative than the
 * docs page and worth using when a provider offers one.
 *
 * ## Usage note, measured rather than assumed
 *
 * xAI reports `completion_tokens_details.reasoning_tokens`, and those tokens
 * are **not** included in `completion_tokens`. A live call on 2026-09-01
 * returned `prompt_tokens: 647, completion_tokens: 1, reasoning_tokens: 647,
 * total_tokens: 1295` — the total is prompt + completion + reasoning, and the
 * completion count is the single word "Yes".
 *
 * This is exactly why the schema stores the vendor's own `total_tokens` instead
 * of always deriving input + output: deriving it here would report 648 for a
 * call that actually billed 1295.
 *
 * It also explains this provider's time-to-first-token. The stream sends
 * `delta.reasoning_content` chunks for several seconds before the first
 * `delta.content` chunk, and ttfb deliberately measures the first *content*
 * token — so a one-word answer can legitimately show an 11-second ttfb.
 */
import { createOpenAiCompatibleAdapter } from './openai-compatible.ts'
import type { RetryPolicy } from './http.ts'
import type { ProviderAdapter } from './types.ts'

export function createXaiAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    id: 'xai',
    displayName: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    policy,
  })
}
