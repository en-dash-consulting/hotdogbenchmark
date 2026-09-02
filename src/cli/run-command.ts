/**
 * `bench run` — the command the weekly job invokes.
 *
 * This is the Node-only half of running a benchmark: read the registries and
 * the environment, call the runtime-agnostic `runBenchmark`, then write the
 * result to disk and refresh the manifest. The loop itself knows nothing about
 * any of that.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { planJobs, runBenchmark } from '../runner/run.ts'
import { getAdapter } from '../providers/registry.ts'
import { registerAllAdapters } from '../providers/all.ts'
import { installMockAdapters } from './mock-fixtures.ts'
import { loadConditions, loadModels, loadQuestions, REPO_ROOT } from '../data/registries.ts'
import { CONTROL_CONDITION_ID, renderSystemPrompt } from '../schema/conditions.ts'
import type { ConditionEntry } from '../schema/conditions.ts'
import { writeManifest } from '../data/index.ts'
import { RUNS_DIR, editionKeyFor, runPathForKey, type Cadence } from '../data/paths.ts'
import { credentialsFromEnv } from '../env.ts'
import { formatCost } from '../runner/cost.ts'
import type { BenchmarkRun } from '../schema/run.ts'
import type { QuestionEntry } from '../schema/questions.ts'

export interface RunCommandOptions {
  mock: boolean
  dryRun: boolean
  samples: number
  concurrency: number
  timeoutMs: number
  /** Comma-separated model ids to restrict to. Empty means all enabled. */
  modelIds: string[]
  /** Comma-separated question ids to restrict to. Empty means all enabled. */
  questionIds: string[]
  /**
   * Condition ids to run. Empty means every enabled condition. The control is
   * always included: every other arm is measured against it, and a run file
   * without it does not validate.
   */
  conditionIds: string[]
  /**
   * Whether this run is a weekly edition (the default) or a daily one. Decides
   * the edition key, and with it the filename and what a re-run replaces.
   */
  cadence: Cadence
  /** Override the output path. */
  out?: string
  root?: string
}

/** Exit codes: 0 success, 1 every job failed, 2 invalid usage. */
export async function runBenchCommand(options: RunCommandOptions): Promise<number> {
  const root = options.root ?? REPO_ROOT

  let questions = loadQuestions(root)
  let models = loadModels(root)
  let conditions = loadConditions(root)

  if (options.questionIds.length > 0) {
    const wanted = new Set(options.questionIds)
    const unknown = options.questionIds.filter((id) => !questions.some((q) => q.id === id))
    if (unknown.length > 0) {
      console.error(
        `Unknown question id(s): ${unknown.join(', ')}\n` +
          `Enabled questions: ${questions.map((q) => q.id).join(', ')}`,
      )
      return 2
    }
    questions = questions.filter((q) => wanted.has(q.id))
  }

  if (options.conditionIds.length > 0) {
    const wanted = new Set([CONTROL_CONDITION_ID, ...options.conditionIds])
    const unknown = options.conditionIds.filter((id) => !conditions.some((c) => c.id === id))
    if (unknown.length > 0) {
      console.error(
        `Unknown condition id(s): ${unknown.join(', ')}\n` +
          `Enabled conditions: ${conditions.map((c) => c.id).join(', ')}`,
      )
      return 2
    }
    conditions = conditions.filter((c) => wanted.has(c.id))
  }

  if (options.modelIds.length > 0) {
    const wanted = new Set(options.modelIds)
    const unknown = options.modelIds.filter((id) => !models.some((m) => m.modelId === id))
    if (unknown.length > 0) {
      console.error(
        `Unknown model id(s): ${unknown.join(', ')}\n` +
          `Enabled models: ${models.map((m) => m.modelId).join(', ')}`,
      )
      return 2
    }
    models = models.filter((m) => wanted.has(m.modelId))
  }

  // In mock mode every adapter is replaced by the fixture replayer and every
  // provider gets a placeholder credential, so no key is needed anywhere.
  registerAllAdapters()
  const credentials = options.mock
    ? Object.fromEntries(models.map((m) => [m.provider, 'mock']))
    : credentialsFromEnv()

  let restoreAdapters: (() => void) | undefined
  if (options.mock) restoreAdapters = installMockAdapters(root)

  const plan = planJobs(questions, models, credentials, conditions)

  if (plan.jobs.length === 0) {
    console.error(
      'Nothing to run: no model has a credential configured.\n' +
        'Set provider keys in .env, or run with --mock to replay recorded fixtures.',
    )
    return 2
  }

  // The edition is decided now rather than from the run's own start time so the
  // dry-run plan and the overwrite guard below describe the file that will
  // actually be written.
  const editionKey = editionKeyFor(new Date(), options.cadence)
  const outPath = options.out ?? runPathForKey(editionKey)

  // Mock data must never replace a real edition. Re-running a week overwrites
  // it by design, and that is right for a real re-run — but a newcomer
  // following the quickstart on a clone that already has this week's real
  // data would otherwise wipe it with fixtures. They can still write the mock
  // run anywhere else with --out.
  if (options.mock && options.out === undefined && !options.dryRun) {
    const existing = readIsMock(resolve(root, outPath))
    if (existing === false) {
      console.error(
        `${outPath} is a real edition (isMock: false), and mock mode will not overwrite real data.\n` +
          'The site already renders that edition. To inspect a mock run, write it elsewhere:\n' +
          '  npm run bench -- run --mock --out tmp/mock-run.json',
      )
      restoreAdapters?.()
      return 2
    }
  }

  if (options.dryRun) {
    printPlan(options, questions, conditions, plan, outPath)
    restoreAdapters?.()
    return 0
  }

  const modelCount = plan.jobs.length / questions.length / conditions.length
  console.log(
    `Running ${plan.jobs.length} job${plan.jobs.length === 1 ? '' : 's'} ` +
      `(${plural(conditions.length, 'condition')} x ` +
      `${plural(questions.length, 'question')} x ` +
      `${plural(modelCount, 'model')}) ` +
      `at ${plural(options.samples, 'sample')} each` +
      `${options.mock ? ', in mock mode' : ''}.\n`,
  )

  try {
    const outcome = await runBenchmark({
      questions,
      models,
      conditions,
      credentials,
      getAdapter,
      fetch: globalThis.fetch,
      samples: options.samples,
      concurrency: options.concurrency,
      timeoutMs: options.timeoutMs,
      runId: randomUUID(),
      runnerVersion: readRunnerVersion(root),
      gitSha: currentGitSha(root),
      isMock: options.mock,
      onProgress: (event) => {
        const cell = `${event.conditionId}/${event.questionId}`.padEnd(22)
        if (event.type === 'job-done') {
          console.log(`  ok    ${cell} ${event.displayName}`)
        } else if (event.type === 'job-error') {
          console.log(`  error ${cell} ${event.displayName}: ${event.error}`)
        }
      },
    })

    for (const skip of outcome.skipped) {
      console.log(`  skip  ${skip.provider} (no key configured)`)
    }

    // The runner is runtime-agnostic and knows nothing about cadences, so the
    // edition key is stamped here. Spread apart and rebuilt so the key sits
    // next to isoWeek in the file, where a reader will look for it.
    const { schemaVersion, runId, isoWeek, ...rest } = outcome.run
    const run: BenchmarkRun = { schemaVersion, runId, isoWeek, editionKey, ...rest }

    const target = resolve(root, outPath)
    mkdirSync(dirname(target), { recursive: true })
    const superseded = supersede(target, run.runId)
    if (superseded) console.log(`Kept the previous run as ${superseded}`)
    writeFileSync(target, JSON.stringify(run, null, 2) + '\n')

    const manifest = writeManifest(root)

    console.log(`\nWrote ${outPath}`)
    console.log(`Wrote ${manifest.path} (${manifest.runs} run${manifest.runs === 1 ? '' : 's'})\n`)
    printSummary(run)

    // Exit 1 only when nothing at all worked. One provider being down is a
    // result worth publishing, not a failed run.
    if (outcome.okJobs === 0) {
      console.error('\nEvery job failed. Not treating this as a successful run.')
      return 1
    }
    return 0
  } finally {
    restoreAdapters?.()
  }
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function printPlan(
  options: RunCommandOptions,
  questions: QuestionEntry[],
  conditions: ConditionEntry[],
  plan: ReturnType<typeof planJobs>,
  outPath: string,
): void {
  const models = [...new Set(plan.jobs.map((job) => job.model.modelId))]
  console.log('Dry run — no provider will be called.\n')
  console.log(`Conditions:   ${conditions.length}`)
  for (const condition of conditions) {
    // Rendered against the first question so the reader sees an actual
    // system prompt rather than a template with a placeholder in it.
    const example = questions[0] ? renderSystemPrompt(condition, questions[0]) : null
    console.log(
      `  ${condition.id.padEnd(12)} ${example === null ? '(no system prompt)' : JSON.stringify(example)}` +
        `${condition.temperature === null ? '' : `  temperature ${condition.temperature}`}`,
    )
  }
  console.log(`\nQuestions:    ${questions.length}`)
  for (const question of questions) {
    console.log(`  ${question.id}: ${question.text}`)
  }
  console.log(`\nModels:       ${models.length}`)
  for (const modelId of models) {
    const job = plan.jobs.find((j) => j.model.modelId === modelId)!
    console.log(`  ${job.model.provider.padEnd(14)} ${modelId}`)
  }
  if (plan.skipped.length > 0) {
    console.log(`\nSkipped (no key configured):`)
    for (const model of plan.skipped) {
      console.log(`  ${model.provider.padEnd(14)} ${model.modelId}`)
    }
  }
  console.log(`\nSamples:      ${options.samples} per model per question per condition`)
  console.log(`Concurrency:  ${options.concurrency} (never more than one per provider)`)
  console.log(`Timeout:      ${options.timeoutMs} ms per request`)
  // The number that matters once conditions multiply it.
  console.log(
    `Matrix:       ${conditions.length} conditions x ${questions.length} questions x ` +
      `${models.length} models x ${options.samples} samples`,
  )
  console.log(`Total calls:  ${plan.jobs.length * options.samples}`)
  console.log(`Cadence:      ${options.cadence === 'day' ? 'daily' : 'weekly'} editions`)
  console.log(`Output:       ${outPath}`)
}

/** A compact per-question, per-model table. */
function printSummary(run: BenchmarkRun): void {
  for (const result of run.results) {
    const question = run.questions.find((q) => q.id === result.questionId)
    console.log(`${result.questionId} — ${question?.text ?? ''}`)

    const nameWidth = Math.max(...result.models.map((m) => m.displayName.length), 5)
    console.log(
      `  ${'model'.padEnd(nameWidth)}  ${'verdict'.padEnd(8)} ${'latency'.padStart(9)} ` +
        `${'out tok'.padStart(8)} ${'cost'.padStart(11)}  answer`,
    )

    for (const model of result.models) {
      if (model.status === 'error') {
        console.log(
          `  ${model.displayName.padEnd(nameWidth)}  ${'ERROR'.padEnd(8)} ` +
            `${(model.error?.category ?? 'unknown').padStart(9)} — ${model.error?.message ?? ''}`,
        )
        continue
      }
      const latency = model.aggregate.totalMs
        ? `${Math.round(model.aggregate.totalMs.median)}ms`
        : '—'
      const outTokens = model.aggregate.outputTokens
        ? String(Math.round(model.aggregate.outputTokens.median))
        : '—'
      const answer = model.samples[0]?.text.replace(/\s+/g, ' ').slice(0, 40) ?? ''
      console.log(
        `  ${model.displayName.padEnd(nameWidth)}  ${(model.aggregate.verdict ?? '—').padEnd(8)} ` +
          `${latency.padStart(9)} ${outTokens.padStart(8)} ` +
          `${formatCost(model.aggregate.costEstimateUsd).padStart(11)}  ${JSON.stringify(answer)}`,
      )
    }

    const tally = { yes: 0, no: 0, other: 0 }
    for (const model of result.models) {
      if (model.aggregate.verdict) tally[model.aggregate.verdict] += 1
    }
    console.log(`  → ${tally.yes} yes, ${tally.no} no, ${tally.other} other\n`)
  }
}

/**
 * Move an existing run out of the way before it is overwritten.
 *
 * Re-running an edition replaces it, and that is right: the site shows one
 * file per edition. But the replaced run is still data somebody paid for, so
 * it is kept under `superseded/`, named by edition key and run id, where the
 * site does not read it but nothing has to be recovered from git later.
 * Returns the relative path it went to, or null when there was nothing to
 * move.
 */
function supersede(target: string, newRunId: string): string | null {
  if (!existsSync(target)) return null
  let previous: { runId?: unknown; isoWeek?: unknown; editionKey?: unknown }
  try {
    previous = JSON.parse(readFileSync(target, 'utf8')) as typeof previous
  } catch {
    return null
  }
  if (typeof previous.runId !== 'string' || previous.runId === newRunId) return null
  // A file from before cadences existed has only a week, which was its edition.
  const key =
    typeof previous.editionKey === 'string'
      ? previous.editionKey
      : typeof previous.isoWeek === 'string'
        ? previous.isoWeek
        : 'unknown-edition'
  const dir = join(dirname(target), 'superseded')
  mkdirSync(dir, { recursive: true })
  const destination = join(dir, `${key}-${previous.runId}.json`)
  renameSync(target, destination)
  return `${RUNS_DIR}/superseded/${key}-${previous.runId}.json`
}

/**
 * Whether an existing run file is mock data. Null when there is no file or it
 * cannot be read — an unreadable file is not evidence of real data, and the
 * write will surface whatever is wrong with it anyway.
 */
export function readIsMock(path: string): boolean | null {
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { isMock?: unknown }
    return typeof parsed.isMock === 'boolean' ? parsed.isMock : null
  } catch {
    return null
  }
}

/** The runner's own version, stamped into every run file. */
function readRunnerVersion(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      version?: string
    }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/**
 * The commit this run was produced from.
 *
 * Read from `GITHUB_SHA` in CI, otherwise from git. Null outside a checkout,
 * which is a legitimate state (someone running from a tarball) rather than an
 * error.
 */
function currentGitSha(root: string): string | null {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}
