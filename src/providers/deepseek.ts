/**
 * DeepSeek.
 *
 * OpenAI-compatible in shape, with one real difference worth the override
 * below: DeepSeek reports prompt caching as two top-level counters,
 * `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`, rather than
 * OpenAI's nested `prompt_tokens_details.cached_tokens`. The hit counter is
 * what maps onto `cachedInputTokens`.
 *
 * That matters here more than it might elsewhere: this benchmark sends the same
 * fifteen-token prompt nine times a week, so cache hits are the normal case and
 * dropping them would misstate the cost.
 *
 * Model id verified on 2026-09-01 against
 * https://api-docs.deepseek.com/quick_start/pricing/. Note the retired
 * `deepseek-chat` alias now routes into the v4 family.
 */
import {
  createOpenAiCompatibleAdapter,
  defaultExtractUsage,
  type OpenAiCompatibleUsage,
} from './openai-compatible.ts'
import type { RetryPolicy } from './http.ts'
import type { ProviderAdapter } from './types.ts'

export function createDeepSeekAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    id: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    policy,
    extractUsage(usage: OpenAiCompatibleUsage) {
      const base = defaultExtractUsage(usage)
      return {
        ...base,
        // Prefer DeepSeek's own hit counter; fall back to the OpenAI-shaped
        // field so this keeps working if they converge on it later.
        cachedInputTokens: usage.prompt_cache_hit_tokens ?? base.cachedInputTokens,
      }
    },
  })
}
