/**
 * Mistral.
 *
 * Another thin file over the OpenAI-compatible helper. Mistral's chat
 * completions endpoint follows the same request shape and streaming chunk
 * format.
 *
 * Model id verified on 2026-09-01 against https://docs.mistral.ai/inference/pricing.
 *
 * Usage note: Mistral reports the standard prompt/completion token fields and
 * no separate reasoning count, so `reasoningTokens` stays null.
 */
import { createOpenAiCompatibleAdapter } from './openai-compatible.ts'
import type { RetryPolicy } from './http.ts'
import type { ProviderAdapter } from './types.ts'

export function createMistralAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    id: 'mistral',
    displayName: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    policy,
  })
}
