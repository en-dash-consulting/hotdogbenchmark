/**
 * Change over time.
 *
 * The interesting question this project can actually answer is not "what does
 * a model think about a hot dog" but "does it think the same thing next week".
 * That is what these functions compute.
 */
import type { BenchmarkRun, ModelResult, Verdict } from '../../schema/run.ts'
import { getModelResults } from './data.ts'

export interface VerdictSharePoint {
  isoWeek: string
  counts: Record<Verdict, number>
}

/**
 * Verdict counts per edition for one question, oldest first.
 *
 * Counts each *model's* majority verdict once, rather than counting samples, so
 * a model sampled three times does not outvote one sampled once.
 */
export function verdictShareOverTime(
  runs: BenchmarkRun[],
  questionId: string,
): VerdictSharePoint[] {
  return [...runs]
    .reverse()
    .filter((run) => run.results.some((result) => result.questionId === questionId))
    .map((run) => {
      const counts: Record<Verdict, number> = { yes: 0, no: 0, other: 0 }
      for (const model of getModelResults(run, questionId)) {
        if (model.aggregate.verdict) counts[model.aggregate.verdict] += 1
      }
      return { isoWeek: run.isoWeek, counts }
    })
}

export interface PositionChange {
  provider: string
  modelId: string
  displayName: string
  from: Verdict
  to: Verdict
  fromEdition: string
  toEdition: string
}

/**
 * Models whose majority verdict changed between consecutive editions.
 *
 * Called "position changes" in the report, which is the analyst register for
 * flip-flopping.
 *
 * **Only consecutive pairs where the model answered both times count.** A model
 * that was unavailable in between has not changed its position; it has a gap.
 * Treating a gap as a change would manufacture drama out of an outage.
 *
 * Returns newest change first.
 */
export function positionChanges(runs: BenchmarkRun[], questionId: string): PositionChange[] {
  // runs arrive newest first; walk consecutive pairs.
  const changes: PositionChange[] = []

  for (let index = 0; index < runs.length - 1; index += 1) {
    const newer = runs[index]!
    const older = runs[index + 1]!

    const newerModels = getModelResults(newer, questionId)
    const olderModels = getModelResults(older, questionId)

    for (const model of newerModels) {
      const previous = olderModels.find(
        (candidate) => candidate.provider === model.provider && candidate.modelId === model.modelId,
      )
      const to = model.aggregate.verdict
      const from = previous?.aggregate.verdict

      // Both editions must have a verdict for this to be a change.
      if (!to || !from || from === to) continue

      changes.push({
        provider: model.provider,
        modelId: model.modelId,
        displayName: model.displayName,
        from,
        to,
        fromEdition: older.isoWeek,
        toEdition: newer.isoWeek,
      })
    }
  }

  return changes
}

export interface MetricSeries {
  provider: string
  modelId: string
  displayName: string
  points: Array<{ isoWeek: string; value: number | null }>
}

/**
 * One metric per model across every edition, oldest first.
 *
 * Editions where a model produced nothing yield `null` rather than being
 * dropped, so a chart shows a gap instead of quietly closing it.
 */
export function metricOverTime(
  runs: BenchmarkRun[],
  questionId: string,
  pick: (result: ModelResult) => number | null | undefined,
): MetricSeries[] {
  const oldestFirst = [...runs].reverse()
  const models = new Map<string, MetricSeries>()

  for (const run of oldestFirst) {
    for (const result of getModelResults(run, questionId)) {
      const key = `${result.provider}/${result.modelId}`
      if (!models.has(key)) {
        models.set(key, {
          provider: result.provider,
          modelId: result.modelId,
          displayName: result.displayName,
          points: [],
        })
      }
    }
  }

  for (const [key, series] of models) {
    series.points = oldestFirst.map((run) => {
      const result = getModelResults(run, questionId).find(
        (candidate) => `${candidate.provider}/${candidate.modelId}` === key,
      )
      const value = result ? pick(result) : null
      return { isoWeek: run.isoWeek, value: value ?? null }
    })
  }

  return [...models.values()]
}

/** The difference between the two most recent non-null values, or null. */
export function latestDelta(points: Array<{ value: number | null }>): number | null {
  const values = points.map((point) => point.value).filter((v): v is number => v !== null)
  if (values.length < 2) return null
  return values.at(-1)! - values.at(-2)!
}
