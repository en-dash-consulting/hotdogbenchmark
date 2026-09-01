/**
 * Provider id → adapter.
 *
 * The one place that knows every adapter exists. Registering here plus adding a
 * `models.json` entry is the whole of "add a provider"; nothing else in the
 * codebase enumerates vendors.
 *
 * The credential map lives here too, but note that *nothing in this directory
 * ever reads it from the environment*. It is a map from provider id to variable
 * name; the CLI does the reading. That separation is what lets these adapters
 * run in a browser, where there is no environment to read.
 */
import type { ProviderAdapter } from './types.ts'

/** Every adapter, keyed by the id used in `models.json`. */
const adapters = new Map<string, ProviderAdapter>()

/**
 * Add an adapter to the registry.
 *
 * Registering the same id twice is a programming error rather than an override —
 * it means two files both claim to be `openai`, and silently picking one would
 * make the benchmark measure something nobody chose.
 */
export function registerAdapter(adapter: ProviderAdapter): void {
  if (adapters.has(adapter.id)) {
    throw new Error(`Provider "${adapter.id}" is already registered`)
  }
  adapters.set(adapter.id, adapter)
}

/**
 * Look up an adapter, or throw a message that says what *is* available.
 *
 * "Unknown provider: gogle" is a bad error. "Unknown provider: gogle. Known
 * providers: anthropic, deepseek, gemini, …" answers the next question too.
 */
export function getAdapter(id: string): ProviderAdapter {
  const adapter = adapters.get(id)
  if (!adapter) {
    const known = listAdapterIds()
    const suffix = known.length > 0 ? known.join(', ') : '(none registered)'
    throw new Error(`Unknown provider "${id}". Known providers: ${suffix}`)
  }
  return adapter
}

/** Whether a provider id has an adapter. */
export function hasAdapter(id: string): boolean {
  return adapters.has(id)
}

/** Every registered provider id, sorted for stable output. */
export function listAdapterIds(): string[] {
  return [...adapters.keys()].sort()
}

/** Every registered adapter, in id order. */
export function listAdapters(): ProviderAdapter[] {
  return listAdapterIds().map((id) => adapters.get(id)!)
}

/**
 * Replace every registered adapter with one built by `factory`.
 *
 * This is how `--mock` works: swap all seven for the fixture-replaying adapter
 * and the rest of the runner is unchanged and none the wiser. Returns a
 * function that restores the previous registry, which tests use to clean up.
 */
export function overrideAllAdapters(
  factory: (original: ProviderAdapter) => ProviderAdapter,
): () => void {
  const previous = new Map(adapters)
  for (const [id, adapter] of previous) {
    adapters.set(id, factory(adapter))
  }
  return () => {
    adapters.clear()
    for (const [id, adapter] of previous) adapters.set(id, adapter)
  }
}

/** Empty the registry. Tests only. */
export function clearAdapters(): void {
  adapters.clear()
}

/**
 * Provider id → the environment variable holding its key.
 *
 * **Used only by the CLI.** Adapters never see this; they get a key handed to
 * them. It lives here rather than in `src/env.ts` so that adding a provider
 * touches one directory, and `src/env.ts` re-exports it for the CLI's use.
 */
export const CREDENTIAL_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  'llama-hosted': 'TOGETHER_API_KEY',
} as const satisfies Record<string, string>

export type KnownProviderId = keyof typeof CREDENTIAL_ENV_VARS
