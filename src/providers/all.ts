/**
 * Registers every adapter.
 *
 * Importing this module is what populates the registry. It is the one file that
 * has to change when a provider is added, and it is deliberately boring: seven
 * imports, seven registrations, no logic.
 *
 * Kept separate from `registry.ts` so that the registry itself has no knowledge
 * of any particular vendor — tests can register two fakes and nothing else.
 */
import { registerAdapter } from './registry.ts'
import { createAnthropicAdapter } from './anthropic.ts'
import { createOpenAiAdapter } from './openai.ts'
import { createGeminiAdapter } from './gemini.ts'
import { createXaiAdapter } from './xai.ts'
import { createMistralAdapter } from './mistral.ts'
import { createDeepSeekAdapter } from './deepseek.ts'
import { createLlamaHostedAdapter } from './llama-hosted.ts'
import type { RetryPolicy } from './http.ts'

let registered = false

/**
 * Register all seven adapters, once.
 *
 * Idempotent because both the CLI and the test suite call it, and registering
 * a duplicate id is deliberately an error rather than a silent overwrite.
 */
export function registerAllAdapters(policy: Partial<RetryPolicy> = {}): void {
  if (registered) return
  registerAdapter(createAnthropicAdapter(policy))
  registerAdapter(createOpenAiAdapter(policy))
  registerAdapter(createGeminiAdapter(policy))
  registerAdapter(createXaiAdapter(policy))
  registerAdapter(createMistralAdapter(policy))
  registerAdapter(createDeepSeekAdapter(policy))
  registerAdapter(createLlamaHostedAdapter(policy))
  registered = true
}

/** Forget that registration happened. Tests only. */
export function resetAdapterRegistration(): void {
  registered = false
}
