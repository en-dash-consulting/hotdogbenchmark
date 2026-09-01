/**
 * Ranking and week-over-week rank movement.
 *
 * The rank delta is the part of a leaderboard people actually look at, and it
 * is also the easiest thing to get subtly wrong — a model that was absent last
 * week has not "risen"; it is new.
 */
import type { ModelResult } from '../../schema/run.ts'
import { scoreModels, type ScoredModel } from './scores.ts'

export interface RankedModel extends ScoredModel {
  /** 1-based. Ties share a rank. */
  rank: number
  /** Positions gained since the prior edition. Positive is an improvement. */
  delta: number | null
  /** Why `delta` is null, when it is. */
  movement: 'up' | 'down' | 'unchanged' | 'new' | 'returning'
}

const keyOf = (result: { provider: string; modelId: string }) =>
  `${result.provider}/${result.modelId}`

/**
 * Rank models by composite score, descending.
 *
 * **Ties share a rank and the next rank skips** — two models tied at 1 are both
 * first and the next is third, as in any standings table. The order within a
 * tie is broken by display name so the page is deterministic; that tiebreak is
 * presentational and carries no meaning, which the methodology page says.
 */
export function rankModels(results: ModelResult[]): Array<ScoredModel & { rank: number }> {
  const scored = scoreModels(results).sort(
    (a, b) => b.composite - a.composite || a.result.displayName.localeCompare(b.result.displayName),
  )

  let lastScore: number | null = null
  let lastRank = 0

  return scored.map((entry, index) => {
    const rank = lastScore !== null && entry.composite === lastScore ? lastRank : index + 1
    lastScore = entry.composite
    lastRank = rank
    return { ...entry, rank }
  })
}

/**
 * Rank the current edition and compare against the previous one.
 *
 * A model with no prior appearance is `new`, not "up by however many places" —
 * there is no earlier position to have moved from. A model that appeared, then
 * vanished, then came back is `returning` for the same reason.
 */
export function rankWithDeltas(
  current: ModelResult[],
  previous: ModelResult[] | null,
): RankedModel[] {
  const currentRanks = rankModels(current)

  if (!previous || previous.length === 0) {
    return currentRanks.map((entry) => ({ ...entry, delta: null, movement: 'new' as const }))
  }

  const priorRanks = new Map(rankModels(previous).map((entry) => [keyOf(entry.result), entry.rank]))

  return currentRanks.map((entry) => {
    const prior = priorRanks.get(keyOf(entry.result))
    if (prior === undefined) {
      return { ...entry, delta: null, movement: 'new' as const }
    }
    // A smaller rank number is a better position, so the delta is inverted to
    // read as "positions gained".
    const delta = prior - entry.rank
    return {
      ...entry,
      delta,
      movement:
        delta > 0 ? ('up' as const) : delta < 0 ? ('down' as const) : ('unchanged' as const),
    }
  })
}

/** How a movement is written, in words as well as an arrow. */
export const MOVEMENT_LABEL: Record<RankedModel['movement'], string> = {
  up: 'up',
  down: 'down',
  unchanged: 'unchanged',
  new: 'new entry',
  returning: 'returning',
}

/**
 * The arrow for a movement. Always accompanied by the label above.
 *
 * New and returning entries get no glyph at all: they have not moved, so an
 * arrow would be wrong, and a star or similar flourish is out of register for
 * this report. "New entry" is unambiguous on its own.
 */
export const MOVEMENT_GLYPH: Record<RankedModel['movement'], string> = {
  up: '▲',
  down: '▼',
  unchanged: '—',
  new: '',
  returning: '',
}
