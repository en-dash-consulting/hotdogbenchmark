/**
 * The shared HTTP layer every adapter goes through.
 *
 * Timeouts, retries and error classification are identical across seven
 * vendors, so they live here once. An adapter that called `fetch` directly
 * would be re-implementing this badly.
 *
 * ## Defaults
 *
 * | Setting | Default | Why |
 * | --- | --- | --- |
 * | `timeoutMs` | 60000 | Generous for a one-word answer. A reasoning model thinking hard about a hot dog is the slow case. |
 * | `maxRetries` | 3 | Four attempts total. Beyond that a provider is having a bad day and the run should record that. |
 * | `baseDelayMs` | 500 | First retry waits ~0.5s, then ~1s, then ~2s. |
 * | `maxDelayMs` | 20000 | Ceiling, so exponential growth cannot outlast the weekly job. |
 * | `jitter` | 0.25 | ±25% randomness so seven models retrying together do not resynchronize into a thundering herd. |
 *
 * ## What is retried
 *
 * 429 and 5xx, and network-level failures. Never 400, 401 or 403: a bad key
 * will still be bad in two seconds, and retrying it wastes the run's time
 * budget while producing the same error.
 *
 * `Retry-After` wins over computed backoff whenever a provider sends one. The
 * provider knows when it will be ready; guessing is strictly worse.
 *
 * ## Logging
 *
 * Retry logging receives a **method, a status, and a URL with its query string
 * removed** — never headers, never a body. Not "headers are redacted": they are
 * never passed in, so there is nothing to redact and nothing to get wrong later.
 * The query string goes because some vendors accept an API key as a query
 * parameter, and a URL that has been through `safeUrl` cannot carry one.
 */
import { ProviderError, categoryForStatus, toProviderError } from './types.ts'

export interface RetryPolicy {
  /** Per-attempt timeout in milliseconds. */
  timeoutMs: number
  /** Retries after the first attempt. `3` means up to four attempts. */
  maxRetries: number
  /** Delay before the first retry; doubles each time. */
  baseDelayMs: number
  /** Upper bound on any single delay. */
  maxDelayMs: number
  /** Fractional randomness applied to each delay, 0..1. */
  jitter: number
  /** Injectable for tests. Defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable for tests. Defaults to `Math.random`. */
  random?: () => number
  /** Called before each retry. Receives no headers and no body, by construction. */
  onRetry?: (info: RetryInfo) => void
}

export interface RetryInfo {
  /** 1 for the first retry. */
  attempt: number
  /** How many retries remain after this one. */
  remaining: number
  /** How long we are about to wait. */
  delayMs: number
  /** The status that triggered the retry, or null for a network failure. */
  status: number | null
  /** Origin and path only. Never carries a query string. */
  url: string
  /** Short reason, safe to print. */
  reason: string
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  timeoutMs: 60_000,
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 20_000,
  jitter: 0.25,
}

/** Origin and path only — deliberately drops any query string. */
export function safeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '(unparseable url)'
  }
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Parse `Retry-After`, which is either a delay in seconds or an HTTP date.
 *
 * Returns null for anything unparseable rather than guessing, so the caller
 * falls back to computed backoff.
 */
export function parseRetryAfter(
  headerValue: string | null,
  now: number = Date.now(),
): number | null {
  if (!headerValue) return null
  const trimmed = headerValue.trim()

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000
  }
  const asDate = Date.parse(trimmed)
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - now)
  }
  return null
}

/** Exponential backoff with jitter, clamped to `maxDelayMs`. */
export function backoffDelay(attempt: number, policy: RetryPolicy, random = Math.random): number {
  const exponential = policy.baseDelayMs * 2 ** (attempt - 1)
  const clamped = Math.min(exponential, policy.maxDelayMs)
  // Jitter is symmetric around the computed delay: ±jitter fraction.
  const spread = clamped * policy.jitter
  return Math.max(0, Math.round(clamped - spread + random() * spread * 2))
}

/** Whether a status is worth another attempt. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export interface FetchContext {
  fetch: typeof globalThis.fetch
  /** The runner's overall signal. Aborting it cancels the request and all retries. */
  signal?: AbortSignal
}

/**
 * `fetch` with a per-attempt timeout, bounded retries, and normalized errors.
 *
 * Returns a `Response` only for statuses an adapter should read. Every failure
 * — HTTP error, timeout, network fault — arrives as a {@link ProviderError}.
 */
export async function fetchWithPolicy(
  url: string,
  init: RequestInit,
  context: FetchContext,
  overrides: Partial<RetryPolicy> = {},
): Promise<Response> {
  const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...overrides }
  const sleep = policy.sleep ?? defaultSleep
  const random = policy.random ?? Math.random
  const logUrl = safeUrl(url)

  let attempt = 0

  for (;;) {
    // The caller gave up (overall run timeout, Ctrl-C) — stop immediately
    // rather than starting another attempt.
    if (context.signal?.aborted) {
      throw new ProviderError('timeout', 'Request canceled before it was sent')
    }

    const timeoutController = new AbortController()
    const timer = setTimeout(() => timeoutController.abort(), policy.timeoutMs)
    // Either the per-attempt timeout or the caller's signal ends this attempt.
    const signal = context.signal
      ? AbortSignal.any([context.signal, timeoutController.signal])
      : timeoutController.signal

    let response: Response
    let failure: ProviderError | null = null

    try {
      response = await context.fetch(url, { ...init, signal })
    } catch (cause) {
      failure = classifyThrow(cause, timeoutController.signal.aborted, policy.timeoutMs)
      response = undefined as unknown as Response
    } finally {
      clearTimeout(timer)
    }

    if (!failure) {
      if (response.ok) return response
      if (!isRetryableStatus(response.status)) {
        throw await httpError(response, logUrl)
      }
      failure = await httpError(response, logUrl)
      // A retryable status still carries a Retry-After worth honoring.
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      if (attempt < policy.maxRetries) {
        attempt += 1
        const delayMs = retryAfter ?? backoffDelay(attempt, policy, random)
        policy.onRetry?.({
          attempt,
          remaining: policy.maxRetries - attempt,
          delayMs,
          status: response.status,
          url: logUrl,
          reason: retryAfter === null ? `status ${response.status}` : `Retry-After honored`,
        })
        await sleep(delayMs)
        continue
      }
      throw failure
    }

    // A thrown failure: retry only if the category says it is worth it.
    if (failure.retryable && attempt < policy.maxRetries) {
      attempt += 1
      const delayMs = backoffDelay(attempt, policy, random)
      policy.onRetry?.({
        attempt,
        remaining: policy.maxRetries - attempt,
        delayMs,
        status: null,
        url: logUrl,
        reason: failure.category,
      })
      await sleep(delayMs)
      continue
    }
    throw failure
  }
}

/** Turn a thrown fetch failure into a categorized ProviderError. */
function classifyThrow(cause: unknown, timedOut: boolean, timeoutMs: number): ProviderError {
  if (timedOut) {
    return new ProviderError('timeout', `Request timed out after ${timeoutMs}ms`, { cause })
  }
  const error = toProviderError(cause, 'Network request failed')
  if (error.category === 'unknown') {
    // A fetch that threw without timing out is a transport-level failure: DNS,
    // TLS, connection reset. Those are transient often enough to be worth one
    // more attempt, unlike a 400.
    return new ProviderError('server', error.message, { cause, retryable: true })
  }
  return error
}

/**
 * Build a ProviderError from a non-OK response.
 *
 * Reads a bounded slice of the body: vendors put useful detail in error
 * responses, but this text ends up on a public web page, so it is truncated and
 * never includes anything from the request.
 */
async function httpError(response: Response, logUrl: string): Promise<ProviderError> {
  const category = categoryForStatus(response.status)
  // An unreadable body is an empty detail, not a second failure.
  const detail = await response.text().then(summarizeErrorBody, () => '')
  const message = detail
    ? `${response.status} ${response.statusText || category} from ${logUrl}: ${detail}`
    : `${response.status} ${response.statusText || category} from ${logUrl}`
  return new ProviderError(category, message, { providerStatus: response.status })
}

/** Pull the human-readable part out of an error body, capped in length. */
export function summarizeErrorBody(body: string, maxLength = 300): string {
  let text = body.trim()
  if (!text) return ''
  try {
    const parsed: unknown = JSON.parse(text)
    // Most vendors nest the message the same way: { error: { message } }.
    const candidate =
      pick(parsed, ['error', 'message']) ??
      pick(parsed, ['message']) ??
      pick(parsed, ['error']) ??
      pick(parsed, ['detail'])
    if (typeof candidate === 'string') text = candidate
  } catch {
    // Not JSON. The raw text, truncated, is still better than nothing.
  }
  text = text.replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function pick(value: unknown, path: string[]): unknown {
  let current = value
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
