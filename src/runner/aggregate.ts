/**
 * Reducing a model's samples to the numbers the report shows.
 *
 * **Medians, not means, throughout.** With three samples, one cold start or one
 * retried request drags a mean somewhere misleading, and the report would then
 * be describing an artifact. The median of three is the middle observation,
 * which is what a reader assumes "typical latency" means anyway.
 *
 * Pure functions with no I/O, so the whole of this file is exhaustively
 * testable and runs unchanged in a browser.
 */
import type { Aggregate, Sample, Stat, Verdict } from '../schema/run.ts'

/**
 * Median, min and max of a list.
 *
 * Returns null for an empty list rather than throwing or inventing a zero —
 * "no samples" is a real state (a model that failed every attempt) and it has
 * to survive into the report as an absence rather than as a value.
 */
export function statOf(values: number[]): Stat | null {
  const usable = values.filter((value) => Number.isFinite(value))
  if (usable.length === 0) return null

  const sorted = [...usable].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? // Even count: the mean of the two middle observations, which is the
        // conventional definition and the only one that is symmetric.
        (sorted[middle - 1]! + sorted[middle]!) / 2
      : sorted[middle]!

  return {
    median: round(median),
    min: round(sorted[0]!),
    max: round(sorted[sorted.length - 1]!),
  }
}

/**
 * The verdict a majority of samples gave.
 *
 * **Ties resolve to `other`**, deliberately. A model that answered yes twice
 * and no twice has not given a consistent answer, and reporting either one as
 * "its verdict" would be picking a side on the model's behalf. `other` is the
 * honest summary of "it did not settle".
 *
 * Returns null for no samples at all.
 */
export function majorityVerdict(verdicts: Verdict[]): Verdict | null {
  if (verdicts.length === 0) return null

  const counts: Record<Verdict, number> = { yes: 0, no: 0, other: 0 }
  for (const verdict of verdicts) counts[verdict] += 1

  const ranked = (Object.entries(counts) as Array<[Verdict, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  const [top, runnerUp] = ranked
  if (!top) return null
  if (runnerUp && runnerUp[1] === top[1]) return 'other'
  return top[0]
}

/**
 * Reduce a model's samples to its `Aggregate`.
 *
 * An empty sample array produces a well-defined empty aggregate — every
 * statistic null, count zero — rather than throwing. Errored models go through
 * here too, and a run must not be lost because one provider was down.
 */
export function aggregateSamples(samples: Sample[]): Aggregate {
  if (samples.length === 0) return emptyAggregate()

  // ttfb is only present for streaming adapters. Nulls are *excluded* rather
  // than treated as zero: including them would report a non-streaming model as
  // instantaneous.
  const ttfbValues = samples
    .map((sample) => sample.timing.ttfbMs)
    .filter((value): value is number => value !== null)

  const costs = samples
    .map((sample) => sample.costEstimateUsd)
    .filter((value): value is number => value !== null)

  return {
    sampleCount: samples.length,
    totalMs: statOf(samples.map((s) => s.timing.totalMs)),
    ttfbMs: ttfbValues.length > 0 ? statOf(ttfbValues) : null,
    inputTokens: statOf(samples.map((s) => s.usage.inputTokens)),
    outputTokens: statOf(samples.map((s) => s.usage.outputTokens)),
    totalTokens: statOf(samples.map((s) => s.usage.totalTokens)),
    tokensPerSecond: statOf(
      samples
        .filter((s) => s.timing.totalMs > 0)
        .map((s) => s.usage.outputTokens / (s.timing.totalMs / 1000)),
    ),
    verdict: majorityVerdict(samples.map((s) => s.verdict)),
    followedInstructionRate: samples.filter((s) => s.followedInstruction).length / samples.length,
    // Summed, not averaged: this is what the week's calls for this model cost.
    // Null when no sample had pricing, rather than zero.
    costEstimateUsd: costs.length > 0 ? round6(costs.reduce((a, b) => a + b, 0)) : null,
  }
}

/** The aggregate for a model that produced nothing. */
export function emptyAggregate(): Aggregate {
  return {
    sampleCount: 0,
    totalMs: null,
    ttfbMs: null,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    tokensPerSecond: null,
    verdict: null,
    followedInstructionRate: null,
    costEstimateUsd: null,
  }
}

/** Four decimals: enough for tokens-per-second, stable in JSON. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
