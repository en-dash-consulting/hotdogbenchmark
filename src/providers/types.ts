/**
 * The provider adapter interface — the main teaching surface of this project.
 *
 * Seven vendors, seven wire formats, one shape. An adapter's whole job is to
 * turn "ask this model this question" into "here is the text, the token counts,
 * and how long it took", so that everything downstream can stop caring which
 * vendor produced it.
 *
 * ## Two constraints, and why they are not negotiable
 *
 * **Credentials are injected, never read from ambient state.** An adapter
 * receives its API key in {@link AdapterContext}. It does not read
 * `process.env`, and ESLint fails the build if it tries.
 *
 * **`fetch` is injected too.** An adapter never reaches for the global.
 *
 * Both exist for the same reason: these files must run unchanged in a browser,
 * where there is no `process` and where requests go through a proxy rather than
 * straight to the vendor. Deciding that up front costs nothing; retrofitting it
 * later means touching every adapter.
 *
 * ## Adding a provider
 *
 * Copy `anthropic.ts`, change the wire format, register it. The interface is
 * deliberately one method wide so that is genuinely all there is to it.
 */
import type { Timing, Usage } from '../schema/run.ts'
import type { ErrorCategory } from '../schema/run.ts'

/**
 * What the adapter is asked to do.
 *
 * Note what is *not* here: no model list, no provider id, no credentials. The
 * adapter is told which model to use; it does not choose. Model IDs live in
 * `models.json` so that changing one is a data edit.
 */
export interface CompleteRequest {
  /** The literal model identifier for this vendor, straight from `models.json`. */
  modelId: string
  /** The full prompt. This benchmark sends one short user message and no system prompt. */
  prompt: string
  /**
   * Upper bound on generated tokens.
   *
   * Set low here on purpose: the question asks for one word, and a cap makes a
   * model that decides to write an essay cost a known amount rather than an
   * unknown one. A model that hits the cap still produces a usable sample —
   * it just did not follow the instruction, which is itself a measurement.
   */
  maxOutputTokens: number
  /**
   * Sampling temperature, when the vendor accepts one.
   *
   * Left undefined by default. Pinning temperature to 0 across seven vendors
   * would not make them comparable — they implement it differently — and it
   * would hide the week-to-week variation this benchmark exists to show.
   */
  temperature?: number
}

/**
 * Everything an adapter needs from the outside world.
 *
 * Injecting all four of these is what makes an adapter a pure function of its
 * inputs, testable with a fake `fetch` and no environment at all.
 */
export interface AdapterContext {
  /** The API key for this provider, supplied by the CLI from the environment. */
  credentials: { apiKey: string }
  /**
   * The `fetch` to use. Node's global in the CLI; a proxy-routing wrapper in
   * the browser; a stub returning recorded fixtures in tests.
   */
  fetch: typeof globalThis.fetch
  /** Aborts the request when the runner's per-request timeout expires. */
  signal: AbortSignal
  /**
   * Called by streaming adapters the instant the first content token arrives.
   *
   * This is how time-to-first-token gets measured. Adapters that do not stream
   * simply never call it, and `ttfbMs` stays null — which the report shows as
   * "not reported" rather than pretending it was zero.
   */
  onFirstToken?: () => void
}

/** What an adapter returns on success. */
export interface CompleteResult {
  /** Exactly what the model said, with no trimming or cleanup. */
  text: string
  /** Token counts mapped onto the shared shape. See `docs/usage-normalization.md`. */
  usage: Usage
  /** Wall-clock timing, and time-to-first-token where the adapter streams. */
  timing: Timing
  /**
   * The vendor's own usage payload, verbatim.
   *
   * Kept so a normalization decision can be re-checked against what the vendor
   * actually sent, months later, without re-running anything.
   */
  raw: unknown
}

/**
 * One provider.
 *
 * Deliberately one method. Anything an adapter is tempted to add — model lists,
 * pricing, retry policy — already lives somewhere shared.
 */
export interface ProviderAdapter {
  /** Stable id matching `models.json` and the credential map. */
  readonly id: string
  /** Human name for logs and error messages. */
  readonly displayName: string
  /** Ask the model. Throws {@link ProviderError} on any failure. */
  complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult>
}

/**
 * A normalized provider failure.
 *
 * Seven vendors report errors seven ways. The runner needs exactly two things
 * from a failure — is it worth retrying, and what does the report say happened —
 * so every adapter converts whatever it got into one of these.
 *
 * The message must always be safe to render on a public web page: never a
 * request header, never key material, never a raw stack trace.
 */
export class ProviderError extends Error {
  readonly category: ErrorCategory
  readonly retryable: boolean
  /** The HTTP status, when the failure came from a response. Null otherwise. */
  readonly providerStatus: number | null

  constructor(
    category: ErrorCategory,
    message: string,
    options: { retryable?: boolean; providerStatus?: number | null; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ProviderError'
    this.category = category
    this.providerStatus = options.providerStatus ?? null
    // Retryability follows from the category unless an adapter knows better —
    // a 429 with no Retry-After is still worth another attempt; a 401 never is.
    this.retryable = options.retryable ?? DEFAULT_RETRYABLE[category]
  }

  /** The serializable form stored in a run file. */
  toJSON(): {
    category: ErrorCategory
    message: string
    retryable: boolean
    providerStatus: number | null
  } {
    return {
      category: this.category,
      message: this.message,
      retryable: this.retryable,
      providerStatus: this.providerStatus,
    }
  }
}

/**
 * Whether each category is worth a second attempt.
 *
 * `bad_response` is not retryable on purpose: a body we could not parse will
 * parse exactly as badly the second time, and retrying it just spends money.
 */
export const DEFAULT_RETRYABLE: Record<ErrorCategory, boolean> = {
  auth: false,
  rate_limit: true,
  timeout: true,
  server: true,
  bad_response: false,
  unknown: false,
}

/** Map an HTTP status onto an error category. */
export function categoryForStatus(status: number): ErrorCategory {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'server'
  if (status >= 400) return 'bad_response'
  return 'unknown'
}

/**
 * Wrap anything thrown into a `ProviderError`.
 *
 * Adapters call this in their outermost catch so that a `TypeError` from a
 * malformed JSON body and a DNS failure both arrive at the runner as the same
 * kind of thing.
 */
export function toProviderError(
  cause: unknown,
  fallbackMessage = 'Provider call failed',
): ProviderError {
  if (cause instanceof ProviderError) return cause
  if (cause instanceof Error) {
    // An aborted fetch is the timeout the runner asked for, not a mystery.
    if (cause.name === 'AbortError' || cause.name === 'TimeoutError') {
      return new ProviderError('timeout', 'Request timed out', { cause })
    }
    return new ProviderError('unknown', cause.message || fallbackMessage, { cause })
  }
  return new ProviderError('unknown', fallbackMessage, { cause })
}
