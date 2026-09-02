/**
 * The derived scores the report ranks models by.
 *
 * **Every formula here is arbitrary, and the methodology page says so.** These
 * are not measurements; they are opinions expressed as arithmetic, in the
 * tradition of the analyst quadrant this report is imitating. What makes them
 * defensible is that they are stated in full, computed by pure functions, and
 * unit tested — a reader who disagrees can see exactly what they disagree with.
 *
 * Two axes, deliberately chosen so neither is simply "which model is best":
 *
 *   **Decisiveness** — did it commit to an answer, and did it answer the way it
 *   was asked to. Nothing to do with which answer.
 *
 *   **Efficiency** — how quickly and cheaply it did so, normalized against the
 *   other models in the same run.
 *
 * Both land in 0..1. Efficiency is *relative*, so a model's efficiency score
 * changes when its competitors change; decisiveness is absolute. That asymmetry
 * is intentional and documented on the methodology page.
 */
import type { ModelResult } from '../../schema/run.ts'

/** Weight of one-word compliance within the decisiveness score. */
const ONE_WORD_WEIGHT = 0.4

/** Weight of latency within the efficiency score; the rest is token economy. */
const LATENCY_WEIGHT = 0.7

/**
 * How committed a model's answers were, 0..1.
 *
 * The share of samples that reached a yes or a no, blended with the share that
 * answered in exactly one word. A model that hedges every time scores 0; one
 * that answers "Yes" three times scores 1.
 *
 * Note this is **verdict-agnostic**. Answering "No" decisively three times and
 * answering "Yes" decisively three times score identically. There is no correct
 * answer to whether a hot dog is a sandwich, and a score that implied otherwise
 * would be making a claim this project cannot support.
 *
 * Returns 0 for a model that produced no samples.
 */
export function decisiveness(result: ModelResult): number {
  if (result.samples.length === 0) return 0

  const committed =
    result.samples.filter((sample) => sample.verdict !== 'other').length / result.samples.length
  const compliance = result.aggregate.followedInstructionRate ?? 0

  return clamp01(committed * (1 - ONE_WORD_WEIGHT) + compliance * ONE_WORD_WEIGHT)
}

/**
 * How economically a model answered, 0..1, **relative to its peers in this run**.
 *
 * Latency and output-token count are each normalized against the range across
 * the models being compared, inverted so lower is better, then blended. Being
 * relative is what makes the number readable — "0.8" means "near the fast end
 * of this week's field", which is what a reader wants to know. It also means
 * the number is not comparable across weeks, which the methodology page states.
 *
 * When every model has identical latency the normalization is undefined; all of
 * them score 1 rather than 0, since none was slower than any other.
 */
export function efficiency(result: ModelResult, peers: ModelResult[]): number {
  const latency = result.aggregate.totalMs?.median
  const tokens = result.aggregate.outputTokens?.median
  if (latency == null || tokens == null) return 0

  const latencies = peers
    .map((peer) => peer.aggregate.totalMs?.median)
    .filter((value): value is number => value != null)
  const tokenCounts = peers
    .map((peer) => peer.aggregate.outputTokens?.median)
    .filter((value): value is number => value != null)

  const latencyScore = invertedNormal(latency, latencies)
  const tokenScore = invertedNormal(tokens, tokenCounts)

  return clamp01(latencyScore * LATENCY_WEIGHT + tokenScore * (1 - LATENCY_WEIGHT))
}

/**
 * The single number the leaderboard ranks by.
 *
 * An even split of decisiveness and efficiency. Even because there is no
 * principled reason to prefer either, and a weighting chosen to produce a
 * particular ranking would be the kind of thing this report is parodying.
 */
export function compositeScore(result: ModelResult, peers: ModelResult[]): number {
  return clamp01((decisiveness(result) + efficiency(result, peers)) / 2)
}

export interface ScoredModel {
  result: ModelResult
  decisiveness: number
  efficiency: number
  composite: number
}

/**
 * Score every model in a question's results against each other.
 *
 * Errored models are scored too — as zeroes — rather than dropped. A provider
 * that was down had a bad week, and hiding it would quietly flatter whichever
 * vendors happened to be up.
 */
export function scoreModels(results: ModelResult[]): ScoredModel[] {
  const answering = results.filter((result) => result.samples.length > 0)
  return results.map((result) => ({
    result,
    decisiveness: decisiveness(result),
    efficiency: efficiency(result, answering),
    composite: compositeScore(result, answering),
  }))
}

/**
 * The five normalized axes a vendor scorecard radar plots.
 *
 * All 0..1, all "higher is better", so the radar's area is readable at a glance
 * without the reader having to remember which axes are inverted.
 */
export interface RadarAxes {
  decisiveness: number
  speed: number
  responsiveness: number
  tokenEconomy: number
  compliance: number
}

export const RADAR_AXIS_LABELS: Record<keyof RadarAxes, string> = {
  decisiveness: 'Decisiveness',
  speed: 'Speed',
  responsiveness: 'First-token responsiveness',
  tokenEconomy: 'Token economy',
  compliance: 'One-word compliance',
}

export function radarAxes(result: ModelResult, peers: ModelResult[]): RadarAxes {
  const answering = peers.filter((peer) => peer.samples.length > 0)
  return {
    decisiveness: decisiveness(result),
    speed: invertedNormal(
      result.aggregate.totalMs?.median ?? Number.POSITIVE_INFINITY,
      answering.map((p) => p.aggregate.totalMs?.median).filter(isNumber),
    ),
    responsiveness: invertedNormal(
      result.aggregate.ttfbMs?.median ?? Number.POSITIVE_INFINITY,
      answering.map((p) => p.aggregate.ttfbMs?.median).filter(isNumber),
    ),
    tokenEconomy: invertedNormal(
      result.aggregate.outputTokens?.median ?? Number.POSITIVE_INFINITY,
      answering.map((p) => p.aggregate.outputTokens?.median).filter(isNumber),
    ),
    compliance: result.aggregate.followedInstructionRate ?? 0,
  }
}

/**
 * Normalize a value against a population, inverted so lower input scores higher.
 *
 * Returns 1 when every value in the population is identical: nothing was slower
 * than anything else, so nothing should be penalized. Returns 0 for a value
 * that is not finite, which is how an errored model lands at the bottom.
 */
function invertedNormal(value: number, population: number[]): number {
  if (!Number.isFinite(value) || population.length === 0) return 0
  const min = Math.min(...population)
  const max = Math.max(...population)
  if (max === min) return 1
  return clamp01(1 - (value - min) / (max - min))
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, Math.round(value * 10_000) / 10_000))
}

/**
 * The formulas, in words, for the methodology page to render.
 *
 * Kept next to the implementation so the two cannot drift: a test asserts every
 * exported score function has an entry here.
 */
export const SCORE_DEFINITIONS = [
  {
    name: 'Decisiveness',
    range: '0 to 1',
    formula: `(share of samples with a yes or no verdict) × ${1 - ONE_WORD_WEIGHT} + (share answering in exactly one word) × ${ONE_WORD_WEIGHT}`,
    note: 'Verdict-agnostic: answering "Yes" three times and "No" three times score identically. There is no correct answer here, and a score implying otherwise would be a claim this research cannot support.',
  },
  {
    name: 'Efficiency',
    range: '0 to 1',
    formula: `(inverted normalized median latency) × ${LATENCY_WEIGHT} + (inverted normalized median output tokens) × ${(1 - LATENCY_WEIGHT).toFixed(1)}`,
    note: 'Normalized against the other models in the same edition, so it is a measure of standing within a field rather than an absolute quantity, and is not comparable between editions. Where every model shares a latency, all score 1.',
  },
  {
    name: 'Composite score',
    range: '0 to 1',
    formula: '(decisiveness + efficiency) ÷ 2',
    note: 'An even split, because there is no principled reason to prefer either and a weighting tuned to produce a particular ranking is exactly what this report format is imitating.',
  },
] as const
