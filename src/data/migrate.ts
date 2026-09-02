/**
 * Migrating older run files to the current schema, on read.
 *
 * Run files are committed and kept forever, and the archive is never
 * rewritten: an edition stays byte-identical to what was published. So when
 * the schema moves, the site and the CLI migrate each file *as they load it*,
 * and the migrated shape lives only in memory.
 *
 * ## Version 1 → 2
 *
 * Version 2 introduced experimental conditions. A version-1 run asked every
 * question plainly, with no system prompt — which is exactly the definition of
 * the control condition. The migration therefore records one condition,
 * `control`, and assigns every existing result to it. Nothing is invented: the
 * `prompt` recorded on each cell is the question text the run already carried,
 * and `systemPrompt` is null because none was sent.
 *
 * Pure and runtime-agnostic, so the browser runner and the site build share it.
 */
import { CONTROL_CONDITION } from '../schema/conditions.ts'
import type { BenchmarkRun, BenchmarkRunV1, RunCondition } from '../schema/run.ts'

/** The control condition as recorded in a migrated run. */
export const MIGRATED_CONTROL_CONDITION: RunCondition = {
  id: CONTROL_CONDITION.id,
  label: CONTROL_CONDITION.label,
  description: CONTROL_CONDITION.description,
  systemPrompt: null,
  promptPrefix: null,
  promptSuffix: null,
  temperature: null,
}

/**
 * Convert a version-1 run into the version-2 shape.
 *
 * Already-current runs pass through untouched, so callers can migrate
 * unconditionally.
 */
export function migrateRun(run: BenchmarkRunV1 | BenchmarkRun): BenchmarkRun {
  if (run.schemaVersion !== 1) return run

  const questionText = new Map(run.questions.map((question) => [question.id, question.text]))

  return {
    schemaVersion: 2,
    runId: run.runId,
    isoWeek: run.isoWeek,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    runnerVersion: run.runnerVersion,
    gitSha: run.gitSha,
    isMock: run.isMock,
    questions: run.questions,
    conditions: [MIGRATED_CONTROL_CONDITION],
    results: run.results.map((result) => ({
      questionId: result.questionId,
      conditionId: CONTROL_CONDITION.id,
      // The v1 schema guarantees every result's question is in `questions`,
      // so this lookup cannot miss on a validated run.
      prompt: questionText.get(result.questionId) ?? result.questionId,
      systemPrompt: null,
      models: result.models,
    })),
  }
}
