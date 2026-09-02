/**
 * Reading, validating, and summarizing everything under `data/`.
 *
 * Two jobs:
 *
 *   - `validateAllRuns()` backs `npm run data:validate`, which CI runs on every
 *     pull request so a malformed run file is caught in review rather than by
 *     the site build failing on `main`.
 *   - `buildManifest()` backs `npm run data:index`, which regenerates
 *     `data/index.json` — the summary the site reads so it does not have to
 *     open every edition to build a navigation list.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SCHEMA_VERSION,
  parseBenchmarkRun,
  type BenchmarkRun,
  type Verdict,
} from '../schema/run.ts'
import type { DataManifest, ManifestEntry, QuestionTally } from '../schema/manifest.ts'
import { CONTROL_CONDITION_ID } from '../schema/conditions.ts'
import { MANIFEST_PATH, RUNS_DIR, isoWeekFromFilename, newestFirst } from './paths.ts'
import { REPO_ROOT } from './registries.ts'

export interface RunFile {
  /** Repository-relative path, e.g. `data/runs/2026-W36.json`. */
  path: string
  run: BenchmarkRun
}

/** Run filenames present under `data/runs`, sorted newest first. */
export function listRunFilenames(root: string = REPO_ROOT): string[] {
  let entries: string[]
  try {
    entries = readdirSync(join(root, RUNS_DIR))
  } catch {
    // No directory yet is not an error: a fresh fork has no data.
    return []
  }
  return entries
    .map((name) => ({ name, isoWeek: isoWeekFromFilename(name) }))
    .filter((entry): entry is { name: string; isoWeek: string } => entry.isoWeek !== null)
    .sort(newestFirst)
    .map((entry) => entry.name)
}

/**
 * Load and validate every run file.
 *
 * Throws on the first invalid file with a message naming that file and the
 * JSON path of the violation, because "a run file is invalid" is not an
 * actionable error message when thirty of them are committed.
 */
export function loadAllRuns(root: string = REPO_ROOT): RunFile[] {
  return listRunFilenames(root).map((name) => readRunFile(root, name))
}

/**
 * Read one run file into a validated run in the current schema shape.
 *
 * Older files are migrated in memory by `parseBenchmarkRun`; nothing here
 * writes, so the committed archive stays exactly as published.
 *
 * Every failure mode here names the file. A message like "unexpected token" is
 * useless when thirty run files are committed and one of them is wrong.
 */
function readRunFile(root: string, name: string): RunFile {
  const path = `${RUNS_DIR}/${name}`
  let raw: string
  try {
    raw = readFileSync(join(root, path), 'utf8')
  } catch (cause) {
    throw new Error(`${path} could not be read`, { cause })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`${path} is not valid JSON:\n  ${detail}`, { cause })
  }
  return { path, run: parseBenchmarkRun(parsed, path) }
}

/**
 * Validate everything under `data/`, collecting failures rather than throwing.
 *
 * Returns one message per bad file so a contributor fixing several sees them
 * all at once.
 */
export function validateAllRuns(root: string = REPO_ROOT): string[] {
  const problems: string[] = []
  for (const name of listRunFilenames(root)) {
    const path = `${RUNS_DIR}/${name}`
    try {
      const { run } = readRunFile(root, name)
      // The filename is load-bearing: the site finds an edition by its name, so
      // a file whose contents disagree with its name would be unreachable.
      const expected = isoWeekFromFilename(name)
      if (run.isoWeek !== expected) {
        problems.push(
          `${path}\n  /isoWeek: file is named ${expected} but its isoWeek is ${run.isoWeek}`,
        )
      }
      if (run.schemaVersion > SCHEMA_VERSION) {
        problems.push(
          `${path}\n  /schemaVersion: written by a newer runner (${run.schemaVersion} > ${SCHEMA_VERSION}); update your checkout`,
        )
      }
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
    }
  }
  return problems
}

/**
 * Tally one question's results across models: how many answered, and what
 * they said. Counts the control arm only, so the headline numbers describe the
 * question asked plainly rather than a blend of every framing.
 */
function tallyQuestion(run: BenchmarkRun, questionId: string): QuestionTally {
  const result = run.results.find(
    (r) => r.questionId === questionId && r.conditionId === CONTROL_CONDITION_ID,
  )
  const verdicts: Record<Verdict, number> = { yes: 0, no: 0, other: 0 }
  let okCount = 0
  let errorCount = 0

  for (const model of result?.models ?? []) {
    if (model.status === 'error') {
      errorCount += 1
      continue
    }
    okCount += 1
    // Count the model's majority verdict, not each sample, so one model is one
    // vote regardless of how many times it was sampled.
    if (model.aggregate.verdict) verdicts[model.aggregate.verdict] += 1
  }

  return { questionId, conditionId: CONTROL_CONDITION_ID, okCount, errorCount, verdicts }
}

function summarize(file: RunFile): ManifestEntry {
  const { run, path } = file
  // A model is counted once per edition even though it answers every question.
  const models = new Set(
    run.results.flatMap((r) => r.models.map((m) => `${m.provider}/${m.modelId}`)),
  )
  return {
    isoWeek: run.isoWeek,
    path,
    runId: run.runId,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    isMock: run.isMock,
    questionIds: run.questions.map((q) => q.id),
    conditionIds: run.conditions.map((c) => c.id),
    modelCount: models.size,
    questions: run.questions.map((q) => tallyQuestion(run, q.id)),
  }
}

/** Build the manifest from every committed run file, newest edition first. */
export function buildManifest(root: string = REPO_ROOT): DataManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    runs: loadAllRuns(root).map(summarize).sort(newestFirst),
  }
}

/**
 * Write `data/index.json`.
 *
 * Deterministic by construction: no generation timestamp, stable ordering, and
 * a fixed two-space indent, so regenerating it from unchanged inputs produces
 * an identical file and a diff always means something changed.
 */
export function writeManifest(root: string = REPO_ROOT): { path: string; runs: number } {
  const manifest = buildManifest(root)
  writeFileSync(join(root, MANIFEST_PATH), JSON.stringify(manifest, null, 2) + '\n')
  return { path: MANIFEST_PATH, runs: manifest.runs.length }
}

/** Read the manifest the site builds from. */
export function readManifest(root: string = REPO_ROOT): DataManifest {
  return JSON.parse(readFileSync(join(root, MANIFEST_PATH), 'utf8')) as DataManifest
}
