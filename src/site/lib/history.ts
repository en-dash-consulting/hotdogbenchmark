/**
 * Change over time.
 *
 * The interesting question this project can actually answer is not "what does
 * a model think about a hot dog" but "does it think the same thing next week".
 * That is what these functions compute.
 */
import type { BenchmarkRun, ModelResult, Verdict } from '../../schema/run.ts'
import { getModelResults } from './data.ts'
import { editionSensitivity, hasConditions, modelsInRun, resultIn } from './sensitivity.ts'
import { CONTROL_CONDITION_ID } from '../../schema/conditions.ts'

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

/**
 * Framing sensitivity per model across editions, oldest first.
 *
 * An edition that ran only the control has no sensitivity to report, so it
 * yields null: a gap in the sparkline, not a zero. Zero means the model was
 * asked under every framing and never moved, which is a finding.
 */
export function sensitivityOverTime(runs: BenchmarkRun[]): MetricSeries[] {
  const oldestFirst = [...runs].reverse()
  const models = new Map<string, MetricSeries>()

  for (const run of oldestFirst) {
    for (const model of modelsInRun(run)) {
      const key = `${model.provider}/${model.modelId}`
      if (!models.has(key)) models.set(key, { ...model, points: [] })
    }
  }

  for (const [key, series] of models) {
    series.points = oldestFirst.map((run) => {
      if (!hasConditions(run)) return { isoWeek: run.isoWeek, value: null }
      const entry = editionSensitivity(run).find(
        (candidate) => `${candidate.model.provider}/${candidate.model.modelId}` === key,
      )
      return { isoWeek: run.isoWeek, value: entry?.overall.score ?? null }
    })
  }

  return [...models.values()]
}

export interface ConsistencyRow {
  provider: string
  modelId: string
  displayName: string
  /** One entry per condition in the run, each listing every sample's verdict in order. */
  byCondition: Array<{ conditionId: string; label: string; verdicts: Verdict[] }>
  /** Share of samples, across every condition, that matched their cell's majority. 1 is perfectly consistent. */
  agreement: number | null
}

/**
 * How consistent each model was with itself: every sample's verdict, per
 * framing, for one question in one edition. Three identical chips in a row
 * is a model that has made its mind up; a mixed row is one that has not,
 * whatever its majority verdict says.
 */
export function sampleConsistency(run: BenchmarkRun, questionId: string): ConsistencyRow[] {
  return modelsInRun(run)
    .filter((model) => run.conditions.some((c) => resultIn(run, questionId, c.id, model)))
    .map((model) => {
      const byCondition = run.conditions.map((condition) => ({
        conditionId: condition.id,
        label: condition.label,
        verdicts: (resultIn(run, questionId, condition.id, model)?.samples ?? []).map(
          (sample) => sample.verdict,
        ),
      }))
      let matched = 0
      let total = 0
      for (const cell of byCondition) {
        const result = resultIn(run, questionId, cell.conditionId, model)
        const majority = result?.aggregate.verdict
        if (!majority) continue
        for (const verdict of cell.verdicts) {
          total += 1
          if (verdict === majority) matched += 1
        }
      }
      return {
        ...model,
        byCondition,
        agreement: total === 0 ? null : Math.round((matched / total) * 10_000) / 10_000,
      }
    })
}

export interface SpreadRow {
  provider: string
  modelId: string
  displayName: string
  /** Fastest, median, and slowest sample under the control, in milliseconds. */
  min: number | null
  median: number | null
  max: number | null
}

/**
 * The spread of latency across a model's samples under the control: the
 * median the report shows, plus the fastest and slowest call behind it.
 */
export function latencySpread(run: BenchmarkRun, questionId: string): SpreadRow[] {
  return modelsInRun(run).flatMap((model) => {
    const result = resultIn(run, questionId, CONTROL_CONDITION_ID, model)
    if (!result || result.samples.length === 0) return []
    const stat = result.aggregate.totalMs
    return [
      {
        ...model,
        min: stat?.min ?? null,
        median: stat?.median ?? null,
        max: stat?.max ?? null,
      },
    ]
  })
}

/**
 * Position changes between consecutive runs of the same edition, newest
 * first. The same `positionChanges` logic as between editions, applied to a
 * week that was asked more than once.
 */
export function runOverRunChanges(
  runsOldestFirst: BenchmarkRun[],
  questionId: string,
): PositionChange[] {
  return positionChanges([...runsOldestFirst].reverse(), questionId)
}
