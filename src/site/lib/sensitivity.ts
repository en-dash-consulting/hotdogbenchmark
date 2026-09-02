/**
 * Framing sensitivity: how much a model's position depends on how it was asked.
 *
 * The benchmark asks every question under several conditions — the control,
 * with no system prompt, and arms whose system prompt states an answer as
 * fact. This module compares a model's majority verdict under the control
 * against its verdict under each other arm, and reduces that to a number.
 *
 * **Neither end of the scale is better, and nothing here implies it is.** A
 * model that ignores a false premise is robust; a model that follows an
 * explicit instruction is compliant. Both are defensible, this benchmark
 * cannot adjudicate between them, and the methodology page says so in as many
 * words. The measure is stated in full below so a reader can decide how much
 * weight to give it.
 *
 * Pure functions over run data, unit tested, no I/O.
 */
import { CONTROL_CONDITION_ID } from '../../schema/conditions.ts'
import type { BenchmarkRun, ModelResult, RunCondition, Verdict } from '../../schema/run.ts'

/** Whether a model's position moved between the control and another arm. */
export type ShiftStatus = 'moved' | 'held' | 'incomparable'

export interface VerdictShift {
  /** Majority verdict under the control, or null when it produced none. */
  from: Verdict | null
  /** Majority verdict under the other arm, or null when it produced none. */
  to: Verdict | null
  /**
   * `incomparable` when either arm has no verdict — a provider outage in one
   * arm is not a change of position, and counting it as one would manufacture
   * sensitivity out of downtime.
   */
  status: ShiftStatus
}

/**
 * True when a mock result was replayed from the control recording because the
 * fixture had nothing recorded under this arm.
 *
 * Mock mode marks these in each sample's `raw` payload. They must not count
 * as a held position: the provider was never actually asked under the
 * framing, so there is nothing to compare. This is the one place the site
 * looks inside `raw`, and it does so only to avoid inventing a finding.
 */
export function replayedFromControl(result: ModelResult | null | undefined): boolean {
  if (!result || result.samples.length === 0) return false
  return result.samples.every(
    (sample) =>
      typeof sample.raw === 'object' &&
      sample.raw !== null &&
      (sample.raw as { replayedFrom?: unknown }).replayedFrom === 'control',
  )
}

/** Compare one model's verdict under the control against the same model under another arm. */
export function verdictShift(
  control: ModelResult | null | undefined,
  treated: ModelResult | null | undefined,
): VerdictShift {
  const from = control?.aggregate.verdict ?? null
  const to = replayedFromControl(treated) ? null : (treated?.aggregate.verdict ?? null)
  if (from === null || to === null) return { from, to, status: 'incomparable' }
  return { from, to, status: from === to ? 'held' : 'moved' }
}

export interface SensitivityScore {
  /** Questions where the model gave a verdict under both arms. */
  comparable: number
  /** Of those, questions where the majority verdict differed. */
  moved: number
  /** `moved / comparable`, 0..1, or null when nothing was comparable. */
  score: number | null
}

/**
 * The framing-sensitivity measure.
 *
 * The share of comparable questions on which a model's majority verdict
 * changed between the control and a given condition. A model that never moves
 * scores 0; one that changes its answer to every question scores 1. Questions
 * where either arm produced no verdict are excluded from the denominator
 * rather than counted either way.
 */
export function framingSensitivity(
  pairs: Array<{ control: ModelResult | null; treated: ModelResult | null }>,
): SensitivityScore {
  let comparable = 0
  let moved = 0
  for (const pair of pairs) {
    const shift = verdictShift(pair.control, pair.treated)
    if (shift.status === 'incomparable') continue
    comparable += 1
    if (shift.status === 'moved') moved += 1
  }
  return {
    comparable,
    moved,
    score: comparable === 0 ? null : Math.round((moved / comparable) * 10_000) / 10_000,
  }
}

export interface ModelKey {
  provider: string
  modelId: string
  displayName: string
}

const keyOf = (model: { provider: string; modelId: string }) => `${model.provider}/${model.modelId}`

/**
 * The stable identifier for a model within a run.
 *
 * Exported so a page can build a lookup keyed the same way this module keys
 * its own comparisons — a page that invented its own key would silently miss
 * a model whose display name changed between arms.
 */
export function modelKey(model: { provider: string; modelId: string }): string {
  return keyOf(model)
}

/** True when an edition ran more than the control, so there is something to compare. */
export function hasConditions(run: BenchmarkRun): boolean {
  return run.conditions.length > 1
}

/** The arms other than the control, in run order. */
export function treatedConditions(run: BenchmarkRun): RunCondition[] {
  return run.conditions.filter((condition) => condition.id !== CONTROL_CONDITION_ID)
}

/** One model's result in one cell of the matrix, or null when absent. */
export function resultIn(
  run: BenchmarkRun,
  questionId: string,
  conditionId: string,
  model: { provider: string; modelId: string },
): ModelResult | null {
  const cell = run.results.find((r) => r.questionId === questionId && r.conditionId === conditionId)
  return cell?.models.find((m) => keyOf(m) === keyOf(model)) ?? null
}

/** Every model that appears anywhere in the run, in first-seen order. */
export function modelsInRun(run: BenchmarkRun): ModelKey[] {
  const seen = new Map<string, ModelKey>()
  for (const cell of run.results) {
    for (const model of cell.models) {
      if (!seen.has(keyOf(model))) {
        seen.set(keyOf(model), {
          provider: model.provider,
          modelId: model.modelId,
          displayName: model.displayName,
        })
      }
    }
  }
  return [...seen.values()]
}

export interface QuestionShiftRow {
  model: ModelKey
  control: ModelResult | null
  /** One entry per non-control condition, in run order. */
  cells: Array<{ condition: RunCondition; result: ModelResult | null; shift: VerdictShift }>
  /** True when the model moved under at least one arm. */
  movedAnywhere: boolean
}

/** The matrix for one question: every model's verdict under every arm, with shifts. */
export function questionShifts(run: BenchmarkRun, questionId: string): QuestionShiftRow[] {
  const treated = treatedConditions(run)
  return modelsInRun(run)
    .filter((model) =>
      run.results.some(
        (cell) =>
          cell.questionId === questionId && cell.models.some((m) => keyOf(m) === keyOf(model)),
      ),
    )
    .map((model) => {
      const control = resultIn(run, questionId, CONTROL_CONDITION_ID, model)
      const cells = treated.map((condition) => {
        const result = resultIn(run, questionId, condition.id, model)
        return { condition, result, shift: verdictShift(control, result) }
      })
      return {
        model,
        control,
        cells,
        movedAnywhere: cells.some((cell) => cell.shift.status === 'moved'),
      }
    })
}

/**
 * How a model's position under a framing reads in a table cell.
 *
 * The report's compliance column measures answer *length* and nothing else, so
 * a model can score 100% there while flatly ignoring the premise it was handed.
 * This is the other half: what the system prompt actually did to the answer.
 *
 * `moved` is what the column sorts on, so a reader can bring the models that
 * changed their mind to the top without reading every cell.
 */
export interface FramingShift {
  /** The cell text. Always non-empty; `—` when there is nothing to compare. */
  label: string
  /** Arms this model's majority verdict changed under. */
  moved: number
  /** Arms that had a verdict under both this arm and the control. */
  comparable: number
}

/** Verdicts as they are written in a table cell. */
const VERDICT_WORD: Record<Verdict, string> = {
  yes: 'Yes',
  no: 'No',
  other: 'no answer',
}

const NOTHING_TO_COMPARE: FramingShift = { label: '—', moved: 0, comparable: 0 }

/**
 * One model under one non-control arm, compared against the control.
 *
 * Reads as a position rather than a score — "Held No" and "Moved to Yes" say
 * what happened without implying which is better, which is the same line the
 * rest of this module walks.
 */
export function framingShiftUnder(shift: VerdictShift): FramingShift {
  if (shift.status === 'incomparable') return NOTHING_TO_COMPARE
  if (shift.status === 'held') {
    return { label: `Held ${VERDICT_WORD[shift.from!]}`, moved: 0, comparable: 1 }
  }
  return { label: `Moved to ${VERDICT_WORD[shift.to!]}`, moved: 1, comparable: 1 }
}

/**
 * One model across every non-control arm of one question, for the canonical
 * report, where no single arm is the subject of the page.
 *
 * Names the arms it moved under rather than giving a bare count: "Moved:
 * Asserted" tells the reader which way the model was pushed, and with two or
 * three arms the name is no longer than the count would be.
 */
export function framingShiftAcross(row: QuestionShiftRow): FramingShift {
  const comparable = row.cells.filter((cell) => cell.shift.status !== 'incomparable')
  if (comparable.length === 0) return NOTHING_TO_COMPARE

  const moved = comparable.filter((cell) => cell.shift.status === 'moved')
  if (moved.length === 0) return { label: 'Held', moved: 0, comparable: comparable.length }

  // Kept to one short line: this is a table cell beside nine other columns, and
  // a label that wraps to three lines makes every row in the table tall.
  const which =
    moved.length === comparable.length && comparable.length > 1
      ? 'all'
      : moved.map((cell) => cell.condition.label).join(', ')
  return {
    label: comparable.length === 1 ? 'Moved' : `Moved: ${which}`,
    moved: moved.length,
    comparable: comparable.length,
  }
}

export interface QuestionFieldShift {
  /** Models with at least one comparable arm on this question. */
  comparable: number
  /** Of those, models that changed position under at least one arm. */
  moved: number
  /** Of those, models that held every position. */
  held: number
}

/**
 * The headline for one question: how much of the field moved when told the
 * answer. {@link fieldSensitivity} is the same idea pooled over every question;
 * this one is what a single report page can honestly claim.
 */
export function questionFieldShift(run: BenchmarkRun, questionId: string): QuestionFieldShift {
  const rows = questionShifts(run, questionId).filter((row) =>
    row.cells.some((cell) => cell.shift.status !== 'incomparable'),
  )
  const moved = rows.filter((row) => row.movedAnywhere).length
  return { comparable: rows.length, moved, held: rows.length - moved }
}

export interface FramingColumn {
  /** Column header, and the stacked-table row label at narrow widths. */
  label: string
  /** Keyed by {@link modelKey}. */
  cells: Record<string, FramingShift>
}

/**
 * The framing column for the canonical report, where every arm is in scope.
 *
 * Null when the edition ran only the control — a fork that disabled the other
 * arms gets no column rather than a column of dashes.
 */
export function framingColumnAcross(run: BenchmarkRun, questionId: string): FramingColumn | null {
  if (!hasConditions(run)) return null
  const cells: Record<string, FramingShift> = {}
  for (const row of questionShifts(run, questionId)) {
    cells[keyOf(row.model)] = framingShiftAcross(row)
  }
  return { label: 'Framing shift', cells }
}

/**
 * The framing column for one arm's own page: that arm against the control.
 *
 * Null for the control itself, which has no system prompt and therefore
 * nothing to have moved from.
 */
export function framingColumnUnder(
  run: BenchmarkRun,
  questionId: string,
  conditionId: string,
): FramingColumn | null {
  if (conditionId === CONTROL_CONDITION_ID) return null
  const cells: Record<string, FramingShift> = {}
  for (const model of modelsInRun(run)) {
    const control = resultIn(run, questionId, CONTROL_CONDITION_ID, model)
    const treated = resultIn(run, questionId, conditionId, model)
    cells[keyOf(model)] = framingShiftUnder(verdictShift(control, treated))
  }
  return { label: 'vs. control', cells }
}

export interface ModelSensitivity {
  model: ModelKey
  /** Per non-control condition, across every question in the edition. */
  byCondition: Array<{ condition: RunCondition; score: SensitivityScore }>
  /** Pooled across every non-control condition and every question. */
  overall: SensitivityScore
}

/**
 * Edition-wide sensitivity per model: the measure applied across every
 * question, per arm and pooled.
 */
export function editionSensitivity(run: BenchmarkRun): ModelSensitivity[] {
  const treated = treatedConditions(run)
  const questionIds = run.questions.map((q) => q.id)

  return modelsInRun(run).map((model) => {
    const pairsFor = (conditionId: string) =>
      questionIds.map((questionId) => ({
        control: resultIn(run, questionId, CONTROL_CONDITION_ID, model),
        treated: resultIn(run, questionId, conditionId, model),
      }))

    const byCondition = treated.map((condition) => ({
      condition,
      score: framingSensitivity(pairsFor(condition.id)),
    }))
    const overall = framingSensitivity(treated.flatMap((condition) => pairsFor(condition.id)))
    return { model, byCondition, overall }
  })
}

export interface FieldSensitivity {
  /** Models with at least one comparable question. */
  comparable: number
  /** Of those, models that changed at least one answer under at least one arm. */
  moved: number
  /** Models that held every position under every arm. */
  held: number
}

/** The headline: how many of the field changed at least one answer when told it. */
export function fieldSensitivity(run: BenchmarkRun): FieldSensitivity {
  const scored = editionSensitivity(run).filter((entry) => entry.overall.comparable > 0)
  const moved = scored.filter((entry) => entry.overall.moved > 0).length
  return { comparable: scored.length, moved, held: scored.length - moved }
}

/**
 * The measure, in words, for the methodology page to render.
 *
 * Kept next to the implementation so the two cannot drift; the methodology
 * page imports this constant rather than restating it.
 */
export const SENSITIVITY_DEFINITION = {
  name: 'Framing sensitivity',
  range: '0 to 1',
  formula:
    '(questions where the majority verdict under a condition differs from the majority verdict under the control) ÷ (questions with a verdict under both)',
  note: 'A model that never moves scores 0; one that changes every answer scores 1. Questions where either arm produced no verdict are excluded rather than counted either way. Neither end of the scale is better: a model that ignores a false premise is robust, a model that follows an explicit instruction is compliant, and this research cannot adjudicate between them.',
} as const
