/**
 * The benchmark loop.
 *
 * Asks every enabled model every enabled question under every enabled
 * condition, several times, and assembles a schema-valid `BenchmarkRun`.
 *
 * ## This file touches no files and reads no environment
 *
 * No `fs`, no `process`, no `node:` imports — enforced by ESLint and by a test
 * that reads the source. Everything external arrives as a parameter: `fetch`,
 * credentials, the clock, the adapter lookup. Persistence happens in the CLI
 * layer afterward.
 *
 * That is not architectural purity for its own sake. It is what lets the same
 * function run in a browser for the deferred "run your own benchmark" feature,
 * and it is why the whole loop can be tested with fake adapters and no network.
 *
 * ## Scheduling
 *
 * Two constraints, and they pull against each other:
 *
 *   **Bounded concurrency.** Some parallelism, or a run takes an hour.
 *   **At most one in-flight call per provider.** Hammering one vendor with
 *   three simultaneous requests invites a 429, and a rate-limited request that
 *   gets retried has a latency measurement that reflects our own impatience
 *   rather than the provider's speed. The benchmark would be measuring itself.
 *
 * So the pool picks the next job whose provider is idle, rather than simply the
 * next job. Within a job, the samples run **sequentially** for the same reason:
 * three parallel calls to one model would contend with each other and the
 * medians would be measuring that contention.
 *
 * ## Failure
 *
 * A provider being down is a result, not a crash. Any job that throws is
 * recorded as a model with `status: "error"` and the run continues. The run as
 * a whole only fails if *every* job failed, which means something systemic —
 * no network, or a completely wrong configuration.
 */
import { isoWeekFor } from '../data/paths.ts'
import { aggregateSamples, emptyAggregate } from './aggregate.ts'
import { analyzeAnswer } from './analyze.ts'
import { estimateCost } from './cost.ts'
import { ProviderError, toProviderError } from '../providers/types.ts'
import { benchmarkRunSchema, formatZodError, SCHEMA_VERSION } from '../schema/run.ts'
import { CONTROL_CONDITION, renderPrompt, renderSystemPrompt } from '../schema/conditions.ts'
import type { AdapterContext, ProviderAdapter } from '../providers/types.ts'
import type { ConditionEntry } from '../schema/conditions.ts'
import type { ModelEntry } from '../schema/models.ts'
import type { QuestionEntry } from '../schema/questions.ts'
import type {
  BenchmarkRun,
  ModelResult,
  ProviderErrorShape,
  RunCondition,
  Sample,
} from '../schema/run.ts'

/** Default samples per model per question. Odd, so a majority verdict exists. */
export const DEFAULT_SAMPLES = 3

/** Default parallel jobs. Low: this is politeness to seven vendors, not a benchmark of them. */
export const DEFAULT_CONCURRENCY = 3

/** Default per-request timeout. */
export const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Cap on generated tokens.
 *
 * **Not 64, which is what this was and which was wrong.** Reasoning models
 * spend the output budget thinking before they emit any text, so a 64-token cap
 * made them return an empty answer: a live Anthropic call came back with
 * `stop_reason: max_tokens`, a single thinking block, zero text blocks, and all
 * 64 output tokens counted as thinking. Gemini truncated mid-word for the same
 * reason.
 *
 * That is the benchmark measuring its own configuration rather than the model —
 * the same failure as letting concurrency skew latency. The cap exists to bound
 * cost, but an empty answer costs the same and is worth nothing.
 *
 * 1024 gives thinking room: the same call at 1024 returns "No." using 80 output
 * tokens, of which 76 were thinking. Models that answer in one word still cost
 * one word; only the ones that need to think pay for it.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024

export interface RunProgressEvent {
  type: 'job-start' | 'sample-done' | 'job-done' | 'job-error'
  conditionId: string
  questionId: string
  provider: string
  modelId: string
  displayName: string
  sampleIndex?: number
  sampleCount?: number
  verdict?: string
  error?: string
}

export interface RunBenchmarkOptions {
  questions: QuestionEntry[]
  models: ModelEntry[]
  /**
   * The experimental conditions to run, control first. Defaults to the control
   * alone, so a caller that knows nothing about conditions gets exactly the
   * benchmark as it was before they existed.
   */
  conditions?: ConditionEntry[]
  /** Provider id → API key. Models whose provider has no key are skipped. */
  credentials: Partial<Record<string, string>>
  /** Injected so the runner never reaches for a global or a registry singleton. */
  getAdapter: (providerId: string) => ProviderAdapter
  fetch: typeof globalThis.fetch
  samples?: number
  concurrency?: number
  timeoutMs?: number
  maxOutputTokens?: number
  /** Run-level temperature. A condition's own temperature, when set, wins. */
  temperature?: number
  /** Injected clock, so a run can be made deterministic in tests. */
  now?: () => Date
  /** Supplied by the caller so the runner needs no randomness source of its own. */
  runId: string
  runnerVersion: string
  gitSha?: string | null
  isMock?: boolean
  onProgress?: (event: RunProgressEvent) => void
  signal?: AbortSignal
}

export interface RunOutcome {
  run: BenchmarkRun
  /** Model-question pairs that produced at least one sample. */
  okJobs: number
  /** Model-question pairs that produced none. */
  errorJobs: number
  /** Models skipped because their provider had no credential. */
  skipped: Array<{ provider: string; modelId: string }>
}

/** One cell of the matrix for one model: a condition, a question, a model. */
interface Job {
  condition: ConditionEntry
  question: QuestionEntry
  model: ModelEntry
}

/** The condition as the run file records it: the definition, minus registry bookkeeping. */
export function toRunCondition(condition: ConditionEntry): RunCondition {
  return {
    id: condition.id,
    label: condition.label,
    description: condition.description,
    systemPrompt: condition.systemPrompt,
    promptPrefix: condition.promptPrefix,
    promptSuffix: condition.promptSuffix,
    temperature: condition.temperature,
  }
}

/**
 * Run the benchmark.
 *
 * Throws only if the assembled run does not validate — which would be a bug in
 * this file, not a provider problem. Every provider failure is captured into
 * the returned run.
 */
export async function runBenchmark(options: RunBenchmarkOptions): Promise<RunOutcome> {
  const {
    questions,
    models,
    conditions = [CONTROL_CONDITION],
    credentials,
    getAdapter,
    samples = DEFAULT_SAMPLES,
    concurrency = DEFAULT_CONCURRENCY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    now = () => new Date(),
    runId,
    runnerVersion,
    gitSha = null,
    isMock = false,
    onProgress,
  } = options

  const startedAt = now()

  // A model whose provider has no key is not a failure — it is a model that
  // was not asked. Recording it as an error would put a fake outage in the
  // archive every week for anyone running with a partial key set.
  const skipped: Array<{ provider: string; modelId: string }> = []
  const runnable = models.filter((model) => {
    const hasKey = Boolean(credentials[model.provider])
    if (!hasKey) skipped.push({ provider: model.provider, modelId: model.modelId })
    return hasKey
  })

  // Condition-major, control first: if a run is aborted part-way, the baseline
  // every other arm is compared against is the part most likely to be whole.
  const jobs: Job[] = conditions.flatMap((condition) =>
    questions.flatMap((question) => runnable.map((model) => ({ condition, question, model }))),
  )

  const results = new Map<string, ModelResult>()
  let okJobs = 0
  let errorJobs = 0

  await runPool(jobs, concurrency, async (job) => {
    const result = await runJob(job, {
      credentials,
      getAdapter,
      fetch: options.fetch,
      samples,
      timeoutMs,
      maxOutputTokens,
      temperature: options.temperature,
      now,
      signal: options.signal,
      onProgress,
    })
    results.set(jobKey(job.condition, job.question, job.model), result)
    if (result.status === 'error') errorJobs += 1
    else okJobs += 1
  })

  const run: BenchmarkRun = {
    schemaVersion: SCHEMA_VERSION,
    runId,
    isoWeek: isoWeekFor(startedAt),
    startedAt: startedAt.toISOString(),
    finishedAt: now().toISOString(),
    runnerVersion,
    gitSha,
    isMock,
    questions: questions.map((question) => ({ id: question.id, text: question.text })),
    conditions: conditions.map(toRunCondition),
    // Rebuilt from the input order rather than from completion order, so a run
    // file's shape does not depend on which provider happened to be fast.
    results: conditions.flatMap((condition) =>
      questions.map((question) => ({
        questionId: question.id,
        conditionId: condition.id,
        // The exact strings sent, recorded per cell so the archive says what
        // was asked rather than what today's rendering code would ask.
        prompt: renderPrompt(condition, question),
        systemPrompt: renderSystemPrompt(condition, question),
        models: runnable
          .map((model) => results.get(jobKey(condition, question, model)))
          .filter((result): result is ModelResult => result !== undefined),
      })),
    ),
  }

  const validated = benchmarkRunSchema.safeParse(run)
  if (!validated.success) {
    throw new Error(
      `The runner produced a run that does not match the schema. This is a bug in the runner.\n${formatZodError(validated.error)}`,
    )
  }

  return { run: validated.data, okJobs, errorJobs, skipped }
}

function jobKey(condition: ConditionEntry, question: QuestionEntry, model: ModelEntry): string {
  return `${condition.id} ${question.id} ${model.provider} ${model.modelId}`
}

interface JobContext {
  credentials: Partial<Record<string, string>>
  getAdapter: (providerId: string) => ProviderAdapter
  fetch: typeof globalThis.fetch
  samples: number
  timeoutMs: number
  maxOutputTokens: number
  temperature?: number
  now: () => Date
  signal?: AbortSignal
  onProgress?: (event: RunProgressEvent) => void
}

/** One model answering one question under one condition, `samples` times, sequentially. */
async function runJob(job: Job, context: JobContext): Promise<ModelResult> {
  const { condition, question, model } = job
  const base = {
    conditionId: condition.id,
    questionId: question.id,
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.displayName,
  }

  context.onProgress?.({ type: 'job-start', ...base })

  const collected: Sample[] = []
  let lastError: ProviderErrorShape | null = null

  for (let index = 0; index < context.samples; index += 1) {
    // The caller aborted the whole run. Stop taking samples; whatever has been
    // collected so far is still valid data.
    if (context.signal?.aborted) break

    try {
      const sample = await takeSample(job, context)
      collected.push(sample)
      context.onProgress?.({
        type: 'sample-done',
        ...base,
        sampleIndex: index + 1,
        sampleCount: context.samples,
        verdict: sample.verdict,
      })
    } catch (cause) {
      const error = toProviderError(cause, `${model.displayName} failed`)
      lastError = error.toJSON()
      // Keep going: two good samples out of three is still a usable result,
      // and it is recorded as `partial` so the report can say so.
    }
  }

  if (collected.length === 0) {
    context.onProgress?.({
      type: 'job-error',
      ...base,
      error: lastError?.message ?? 'no samples collected',
    })
    return {
      ...base,
      status: 'error',
      samples: [],
      aggregate: emptyAggregate(),
      error: lastError ?? {
        category: 'unknown',
        message: 'No samples were collected.',
        retryable: false,
        providerStatus: null,
      },
    }
  }

  context.onProgress?.({ type: 'job-done', ...base })

  return {
    ...base,
    status: collected.length === context.samples ? 'ok' : 'partial',
    samples: collected,
    aggregate: aggregateSamples(collected),
    error: lastError,
  }
}

/** One call to one model. */
async function takeSample(job: Job, context: JobContext): Promise<Sample> {
  const { condition, question, model } = job
  const apiKey = context.credentials[model.provider]
  if (!apiKey) {
    throw new ProviderError('auth', `No credential for provider "${model.provider}"`)
  }

  const adapter = context.getAdapter(model.provider)

  // A per-request deadline that also honors the caller's overall signal, so
  // one hung provider cannot hold the whole run open.
  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), context.timeoutMs)
  const signal = context.signal
    ? AbortSignal.any([context.signal, timeoutController.signal])
    : timeoutController.signal

  const adapterContext: AdapterContext = {
    credentials: { apiKey },
    fetch: context.fetch,
    signal,
  }

  // The condition decides how the question is framed. Under the control every
  // one of these is absent and the request is exactly what it always was.
  const systemPrompt = renderSystemPrompt(condition, question)
  const temperature = condition.temperature ?? context.temperature

  try {
    const completion = await adapter.complete(
      {
        modelId: model.modelId,
        prompt: renderPrompt(condition, question),
        maxOutputTokens: context.maxOutputTokens,
        ...(systemPrompt === null ? {} : { systemPrompt }),
        ...(temperature === undefined ? {} : { temperature }),
      },
      adapterContext,
    )

    const analysis = analyzeAnswer(completion.text)

    return {
      // Verbatim. Nothing here edits what the model said.
      text: completion.text,
      verdict: analysis.verdict,
      followedInstruction: analysis.followedInstruction,
      usage: completion.usage,
      timing: completion.timing,
      costEstimateUsd: estimateCost(completion.usage, model.pricing),
      raw: completion.raw,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Run jobs with bounded concurrency and at most one in-flight job per provider.
 *
 * The provider constraint is why this is hand-rolled rather than a simple
 * `Promise.all` over chunks: the pool has to skip past a job whose provider is
 * busy and start a different one, not stall waiting for it.
 */
export async function runPool(
  jobs: Job[],
  concurrency: number,
  execute: (job: Job) => Promise<void>,
): Promise<void> {
  const remaining = [...jobs]
  const busyProviders = new Set<string>()
  const active = new Set<Promise<void>>()
  const limit = Math.max(1, Math.floor(concurrency))

  while (remaining.length > 0 || active.size > 0) {
    // Start as many jobs as the limits allow.
    let started = false
    while (active.size < limit) {
      const index = remaining.findIndex((job) => !busyProviders.has(job.model.provider))
      if (index === -1) break

      const [job] = remaining.splice(index, 1)
      if (!job) break

      busyProviders.add(job.model.provider)
      const promise = execute(job).finally(() => {
        busyProviders.delete(job.model.provider)
        active.delete(promise)
      })
      active.add(promise)
      started = true
    }

    if (active.size === 0 && !started) {
      // Nothing running and nothing startable: every remaining job belongs to a
      // provider that is busy, which cannot be true with nothing active. Bail
      // rather than spin.
      break
    }

    // Wait for the next completion, then look for more work. Settled rather
    // than race so a rejection here cannot abandon the pool — though `execute`
    // is expected to have handled its own errors already.
    await Promise.race([...active].map((promise) => promise.catch(() => undefined)))
  }
}

/** Every job a run would perform, for `--dry-run`. Same order as the run itself. */
export function planJobs(
  questions: QuestionEntry[],
  models: ModelEntry[],
  credentials: Partial<Record<string, string>>,
  conditions: ConditionEntry[] = [CONTROL_CONDITION],
): { jobs: Job[]; skipped: ModelEntry[] } {
  const skipped = models.filter((model) => !credentials[model.provider])
  const runnable = models.filter((model) => Boolean(credentials[model.provider]))
  return {
    jobs: conditions.flatMap((condition) =>
      questions.flatMap((question) => runnable.map((model) => ({ condition, question, model }))),
    ),
    skipped,
  }
}
