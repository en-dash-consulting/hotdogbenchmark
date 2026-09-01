/**
 * Measuring how long a provider took, and normalizing what it says about tokens.
 *
 * ## What the clock actually measures
 *
 * `totalMs` is wall-clock time from "we issued the request" to "we finished
 * reading the response". It includes DNS, TLS, the network hop, whatever
 * queueing the provider is doing, and the generation itself. It is **not** a
 * measure of inference speed, and this project never claims it is — the
 * methodology page says so in the same words.
 *
 * `ttfbMs` is the gap between issuing the request and the first content token
 * arriving. It is only available when the adapter streams; otherwise it stays
 * null, which the report renders as "not reported" rather than as a zero.
 *
 * `performance.now()` rather than `Date.now()`: it is monotonic, so a clock
 * adjustment mid-request cannot produce a negative duration.
 */
import type { Timing, Usage } from '../schema/run.ts'

/** A measurement in progress. */
export interface Measurement {
  /**
   * Record that the first content token has arrived.
   *
   * Safe to call more than once; only the first call counts, because a streaming
   * parser may not easily know which chunk is the first *content* chunk.
   */
  markFirstToken: () => void
  /** Stop the clock and produce the `Timing` that goes into the run file. */
  finish: () => Timing
}

/** Injectable clocks, so tests do not depend on real elapsed time. */
export interface Clock {
  /** Monotonic milliseconds. */
  now: () => number
  /** Wall-clock time, for the human-readable `startedAt`. */
  wallClock: () => Date
}

const systemClock: Clock = {
  now: () => performance.now(),
  wallClock: () => new Date(),
}

/**
 * Start measuring.
 *
 * Adapters call this immediately before issuing their request and `finish()`
 * once they have consumed the whole response.
 */
export function startMeasurement(clock: Clock = systemClock): Measurement {
  const startedAt = clock.wallClock().toISOString()
  const startedNow = clock.now()
  let firstTokenNow: number | null = null

  return {
    markFirstToken() {
      firstTokenNow ??= clock.now()
    },
    finish(): Timing {
      const endedNow = clock.now()
      return {
        startedAt,
        ttfbMs: firstTokenNow === null ? null : round(firstTokenNow - startedNow),
        totalMs: round(endedNow - startedNow),
      }
    },
  }
}

/**
 * Time an async operation end to end.
 *
 * The callback receives `markFirstToken` so a streaming adapter can report the
 * first chunk without threading the measurement object through its parser.
 */
export async function measure<T>(
  operation: (markFirstToken: () => void) => Promise<T>,
  clock: Clock = systemClock,
): Promise<{ value: T; timing: Timing }> {
  const measurement = startMeasurement(clock)
  const value = await operation(measurement.markFirstToken)
  return { value, timing: measurement.finish() }
}

/** Milliseconds to three decimal places — enough precision, stable in JSON. */
function round(ms: number): number {
  return Math.max(0, Math.round(ms * 1000) / 1000)
}

/**
 * The shape every adapter maps its vendor's usage payload into.
 *
 * The contract each adapter follows:
 *
 * - `inputTokens` and `outputTokens` are **required**. Every vendor reports
 *   both, under some name. If one is genuinely missing, that is a
 *   `bad_response`, not a zero.
 * - `reasoningTokens` and `cachedInputTokens` are **null when not reported**.
 *   Null is not zero: a model with no reasoning-token concept and a model that
 *   used no reasoning tokens are different facts, and flattening them would
 *   make the first look efficient for free.
 * - `totalTokens` prefers the vendor's own figure. Some vendors' totals do not
 *   equal input + output, and their number is the one on the bill.
 *
 * Whether reasoning tokens are *also* counted inside `outputTokens` varies by
 * vendor. That is recorded per provider in `docs/usage-normalization.md`, not
 * guessed at here.
 */
export interface UsageParts {
  inputTokens: number
  outputTokens: number
  /** The vendor's own total, when it reports one. */
  totalTokens?: number | null
  reasoningTokens?: number | null
  cachedInputTokens?: number | null
}

/**
 * Build a `Usage` from whatever an adapter extracted.
 *
 * Coerces to non-negative integers, because a fractional or negative token
 * count is a parsing mistake and would fail schema validation later with a much
 * less useful message than the adapter's own tests give here.
 */
export function normalizeUsage(parts: UsageParts): Usage {
  const inputTokens = count(parts.inputTokens)
  const outputTokens = count(parts.outputTokens)
  return {
    inputTokens,
    outputTokens,
    totalTokens: parts.totalTokens == null ? inputTokens + outputTokens : count(parts.totalTokens),
    reasoningTokens: optionalCount(parts.reasoningTokens),
    cachedInputTokens: optionalCount(parts.cachedInputTokens),
  }
}

function count(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

/** Null stays null. Only an actual number becomes a count. */
function optionalCount(value: number | null | undefined): number | null {
  return value == null ? null : count(value)
}

/**
 * Output tokens per second of wall-clock time.
 *
 * Null when it cannot be computed. Note this divides by *total* time, so it
 * includes network and queueing — it is throughput as experienced by the
 * caller, not the model's generation rate.
 */
export function tokensPerSecond(outputTokens: number, totalMs: number): number | null {
  if (totalMs <= 0) return null
  return Math.round((outputTokens / (totalMs / 1000)) * 10_000) / 10_000
}
