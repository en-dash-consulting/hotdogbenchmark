/**
 * Meta Llama, served by Together AI.
 *
 * ## Why Together and not Groq
 *
 * Groq was the other candidate and is faster, but in June 2026 it moved its
 * Llama models to enterprise-only "contact sales" pricing. A forker on a free
 * or developer tier cannot run them, which defeats the point of this repository
 * being copyable. Together serves Llama on serverless inference at published
 * per-token rates, so the numbers in `models.json` are numbers anyone can check.
 *
 * ## What this row actually measures
 *
 * The weights are Meta's; the hardware, the batching, and the queueing are
 * Together's. **This row measures Together's serving, not Meta's model.** The
 * methodology page says so, because a reader comparing this latency against a
 * closed model's would otherwise be comparing two different things.
 *
 * Model id verified on 2026-09-01 against
 * https://docs.together.ai/docs/serverless/models.
 */
import { createOpenAiCompatibleAdapter } from './openai-compatible.ts'
import type { RetryPolicy } from './http.ts'
import type { ProviderAdapter } from './types.ts'

export function createLlamaHostedAdapter(policy: Partial<RetryPolicy> = {}): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    id: 'llama-hosted',
    displayName: 'Meta Llama (Together AI)',
    baseUrl: 'https://api.together.xyz/v1',
    policy,
  })
}
