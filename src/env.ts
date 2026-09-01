/**
 * Environment and credential loading — the *only* place in the codebase that
 * reads `process.env` for provider keys.
 *
 * Adapters and the runner core receive credentials through an injected context
 * instead, which is what lets the same code run in a browser. This module is
 * the Node-side edge that turns environment variables into that injected value.
 *
 * Nothing here ever returns, prints, or logs a key's value. `configuredProviders()`
 * reports only *whether* a key is present.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Provider id → the environment variable holding that provider's API key. */
export const PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  'llama-hosted': 'TOGETHER_API_KEY',
} as const satisfies Record<string, string>

export type ProviderId = keyof typeof PROVIDER_ENV_VARS

export const PROVIDER_IDS = Object.keys(PROVIDER_ENV_VARS) as ProviderId[]

/** What `configuredProviders()` reports. Deliberately contains no key material. */
export interface ProviderCredentialStatus {
  provider: ProviderId
  /** The variable that supplies this provider's key, so a user knows what to set. */
  envVar: string
  /** True when the variable is set to a non-empty value. The value itself is never exposed. */
  configured: boolean
}

/**
 * Load a local `.env` file if one exists.
 *
 * Only for local development. CI supplies secrets as real environment variables,
 * so this is skipped when `CI` is set — a `.env` file in CI would be a mistake
 * worth failing loudly over rather than silently honouring.
 */
export function loadLocalEnv(cwd: string = process.cwd()): boolean {
  if (process.env.CI) return false
  const envPath = resolve(cwd, '.env')
  if (!existsSync(envPath)) return false
  process.loadEnvFile(envPath)
  return true
}

/** Report which providers have a key available, without revealing any key. */
export function configuredProviders(
  env: NodeJS.ProcessEnv = process.env,
): ProviderCredentialStatus[] {
  return PROVIDER_IDS.map((provider) => {
    const envVar = PROVIDER_ENV_VARS[provider]
    const raw = env[envVar]
    return { provider, envVar, configured: typeof raw === 'string' && raw.trim().length > 0 }
  })
}

/**
 * Build the credentials map the runner injects into adapters.
 *
 * Returns keys only for providers that actually have one. Callers pass this
 * straight into `runBenchmark`; it never gets logged or serialized into output.
 */
export function credentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Partial<Record<ProviderId, string>> {
  const credentials: Partial<Record<ProviderId, string>> = {}
  for (const { provider, envVar, configured } of configuredProviders(env)) {
    if (configured) credentials[provider] = env[envVar]?.trim()
  }
  return credentials
}
