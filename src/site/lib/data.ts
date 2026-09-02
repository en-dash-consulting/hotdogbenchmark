/**
 * The site's view of `data/`.
 *
 * Everything here runs at **build time**, in Node, and nothing it returns
 * reaches the browser as data — the pages render to static HTML.
 *
 * The load is deliberately eager and validating: every run file, plus both
 * registries, is parsed through the shared zod schemas the moment this module
 * is first imported. A malformed file therefore fails `npm run build` with the
 * offending path, rather than producing a page with a blank column that nobody
 * notices for three weeks.
 */
import { loadAllRuns } from '../../data/index.ts'
import {
  loadConditionsRegistry,
  loadModelsRegistry,
  loadQuestionsRegistry,
  loadSiteRegistry,
  REPO_ROOT,
} from '../../data/registries.ts'
import { enabledQuestions } from '../../schema/questions.ts'
import { enabledModels } from '../../schema/models.ts'
import { CONTROL_CONDITION_ID, enabledConditions } from '../../schema/conditions.ts'
import type { ConditionEntry } from '../../schema/conditions.ts'
import type { ModelEntry } from '../../schema/models.ts'
import type { QuestionEntry } from '../../schema/questions.ts'
import type { SiteRegistry } from '../../schema/site.ts'
import type { BenchmarkRun, ModelResult, QuestionResult, RunCondition } from '../../schema/run.ts'

/**
 * Loaded once per build. Runs are newest edition first, and every one is in
 * the current schema shape: `loadAllRuns` migrates older files on read.
 */
const runs: BenchmarkRun[] = loadAllRuns(REPO_ROOT).map((file) => file.run)
const questionsRegistry = loadQuestionsRegistry(REPO_ROOT)
const modelsRegistry = loadModelsRegistry(REPO_ROOT)
const conditionsRegistry = loadConditionsRegistry(REPO_ROOT)
const siteRegistry = loadSiteRegistry(REPO_ROOT)

/**
 * Every edition, newest first.
 *
 * A fresh fork with no data yet gets an empty array rather than an error; the
 * pages render an empty state. Failing the build would make "clone and run the
 * site" impossible before the first benchmark.
 */
export function getAllRuns(): BenchmarkRun[] {
  return runs
}

/** The most recent edition, or null when there is no data at all. */
export function getLatestRun(): BenchmarkRun | null {
  return runs[0] ?? null
}

/** One edition by its ISO week, or null. */
export function getRun(isoWeek: string): BenchmarkRun | null {
  return runs.find((run) => run.isoWeek === isoWeek) ?? null
}

/** The edition immediately before the given one, or null at the boundary. */
export function getPreviousRun(isoWeek: string): BenchmarkRun | null {
  const index = runs.findIndex((run) => run.isoWeek === isoWeek)
  if (index === -1) return null
  return runs[index + 1] ?? null
}

/** The edition immediately after the given one, or null at the boundary. */
export function getNextRun(isoWeek: string): BenchmarkRun | null {
  const index = runs.findIndex((run) => run.isoWeek === isoWeek)
  if (index <= 0) return null
  return runs[index - 1] ?? null
}

/** Who publishes this, what it is called, and where its code lives. */
export function getSite(): SiteRegistry {
  return siteRegistry
}

/** The questions currently asked, in registry order. The hot dog leads. */
export function getQuestions(): QuestionEntry[] {
  return enabledQuestions(questionsRegistry)
}

/** One question's registry entry, or null. */
export function getQuestion(questionId: string): QuestionEntry | null {
  return questionsRegistry.questions.find((question) => question.id === questionId) ?? null
}

/** The models currently benchmarked, in registry order. */
export function getModels(): ModelEntry[] {
  return enabledModels(modelsRegistry)
}

/** One model's registry entry — where pricing, docs links and vendor live. */
export function getModelEntry(provider: string, modelId: string): ModelEntry | null {
  return (
    modelsRegistry.models.find(
      (model) => model.provider === provider && model.modelId === modelId,
    ) ?? null
  )
}

/** The conditions currently configured, control first. What the runner will run next. */
export function getConditionsRegistry(): ConditionEntry[] {
  return enabledConditions(conditionsRegistry)
}

/** One condition as an edition recorded it, or null when that edition did not run it. */
export function getCondition(run: BenchmarkRun, conditionId: string): RunCondition | null {
  return run.conditions.find((condition) => condition.id === conditionId) ?? null
}

/**
 * One cell of an edition's matrix — a question under a condition — or null if
 * that edition did not ask it that way.
 *
 * Defaults to the control, so every caller that predates conditions keeps
 * reading the question asked plainly.
 */
export function getQuestionResult(
  run: BenchmarkRun,
  questionId: string,
  conditionId: string = CONTROL_CONDITION_ID,
): QuestionResult | null {
  return (
    run.results.find(
      (result) => result.questionId === questionId && result.conditionId === conditionId,
    ) ?? null
  )
}

/** The models that answered one question under one condition, in registry order. */
export function getModelResults(
  run: BenchmarkRun,
  questionId: string,
  conditionId: string = CONTROL_CONDITION_ID,
): ModelResult[] {
  return getQuestionResult(run, questionId, conditionId)?.models ?? []
}

/** The question text as it was asked in a given edition, which can differ from today's. */
export function getQuestionTextInRun(run: BenchmarkRun, questionId: string): string | null {
  return run.questions.find((question) => question.id === questionId)?.text ?? null
}

export interface HistoryPoint {
  isoWeek: string
  result: ModelResult | null
}

/**
 * One model's results for one question across every edition, oldest first.
 *
 * Editions where the model was absent yield a null result rather than being
 * skipped, so a sparkline shows a gap instead of silently closing it — a model
 * that was down for a week should look different from one that was never
 * benchmarked.
 */
export function getModelHistory(
  questionId: string,
  provider: string,
  modelId: string,
): HistoryPoint[] {
  return [...runs].reverse().map((run) => ({
    isoWeek: run.isoWeek,
    result:
      getModelResults(run, questionId).find(
        (model) => model.provider === provider && model.modelId === modelId,
      ) ?? null,
  }))
}

/** Every model that has ever answered a question, deduplicated, in registry order. */
export function getModelsSeenForQuestion(questionId: string): Array<{
  provider: string
  modelId: string
  displayName: string
}> {
  const seen = new Map<string, { provider: string; modelId: string; displayName: string }>()
  // Registry order first, so currently-enabled models sort ahead of retired ones.
  for (const model of getModels()) {
    seen.set(`${model.provider}/${model.modelId}`, {
      provider: model.provider,
      modelId: model.modelId,
      displayName: model.displayName,
    })
  }
  for (const run of runs) {
    for (const result of getModelResults(run, questionId)) {
      const key = `${result.provider}/${result.modelId}`
      if (!seen.has(key)) {
        seen.set(key, {
          provider: result.provider,
          modelId: result.modelId,
          displayName: result.displayName,
        })
      }
    }
  }
  return [...seen.values()]
}

/** Questions that appear in at least one edition, for archive pages. */
export function getQuestionsInRun(run: BenchmarkRun): Array<{ id: string; text: string }> {
  return run.questions
}

/** Whether the site has anything to render yet. */
export function hasData(): boolean {
  return runs.length > 0
}
