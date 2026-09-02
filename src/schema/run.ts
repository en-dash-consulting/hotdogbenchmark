/**
 * The benchmark run schema — the contract between the runner and the site.
 *
 * The runner writes files matching these shapes into `data/runs/`. The site
 * build refuses to start if any committed file does not match. Everything
 * downstream (charts, scores, the leaderboard) can therefore assume the data
 * is well-formed rather than defending against it.
 *
 * ## Why `schemaVersion` exists from day one
 *
 * Run files are committed and kept forever, so the archive will eventually
 * contain files written by several generations of this schema. A run carries
 * the version it was written under, which is what lets the site render a
 * two-year-old edition after the shape has moved on. Bump {@link SCHEMA_VERSION}
 * whenever a change would make an older file invalid, and add a migration
 * rather than rewriting history.
 *
 * Field-by-field documentation, including units and why each nullable field may
 * be null, lives in `docs/data-schema.md`.
 */
import { z } from 'zod'
import { CONTROL_CONDITION_ID } from './conditions.ts'
import { migrateRun } from '../data/migrate.ts'

/**
 * Current schema version. Increment on any breaking change to the shapes below.
 *
 * Breaking means: an existing committed run file would stop validating. Adding
 * an optional field is not breaking; making a field required, removing one, or
 * narrowing a type is.
 *
 * ## History
 *
 * - **1** — the original shape: questions × models.
 * - **2** — experimental conditions. Every result carries a `conditionId`, the
 *   run records the `conditions` it ran, and each result records the exact
 *   `prompt` and `systemPrompt` sent. Version-1 files are migrated on read by
 *   assigning everything to the control condition, which is what they were.
 */
export const SCHEMA_VERSION = 2

/** An ISO week label in UTC, e.g. `2026-W36`. One benchmark edition per week. */
export const isoWeekSchema = z
  .string()
  .regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, 'isoWeek must look like 2026-W36')

/** A non-negative integer count of tokens. Providers never report negatives. */
const tokenCount = z.number().int().nonnegative()

/** A duration in milliseconds. Fractional because `performance.now()` is. */
const durationMs = z.number().nonnegative()

const isoTimestamp = z.string().datetime({ offset: true })

/**
 * What a model answered, reduced to three buckets.
 *
 * `other` is deliberately a bucket and not a failure: a model that replies
 * "Contextually" has answered the question, just not in the shape requested.
 * Classification rules live in `src/runner/analyze.ts` and are rendered on the
 * methodology page so the reader can disagree with them.
 */
export const verdictSchema = z.enum(['yes', 'no', 'other'])
export type Verdict = z.infer<typeof verdictSchema>

/**
 * How a provider call failed, normalized across vendors.
 *
 * The category is what the site renders and what the retry policy keys off;
 * the vendor's own message is kept for the human reading the report.
 */
export const errorCategorySchema = z.enum([
  /** Bad or missing credentials. Never retried — retrying will not find a key. */
  'auth',
  /** Rate limited. Retried with backoff, honoring `Retry-After`. */
  'rate_limit',
  /** The request exceeded the per-request timeout and was aborted. */
  'timeout',
  /** A 5xx from the provider. Retried. */
  'server',
  /** A 2xx whose body we could not make sense of. Not retried; retrying gets the same body. */
  'bad_response',
  /** Anything else, including network-level failures. */
  'unknown',
])
export type ErrorCategory = z.infer<typeof errorCategorySchema>

export const providerErrorSchema = z.object({
  category: errorCategorySchema,
  /** Human-readable, safe to render. Never contains headers or key material. */
  message: z.string(),
  /** Whether the runner considered another attempt worthwhile. */
  retryable: z.boolean(),
  /** The HTTP status, when the failure came from an HTTP response. */
  providerStatus: z.number().int().nullable().default(null),
})
export type ProviderErrorShape = z.infer<typeof providerErrorSchema>

/**
 * Token usage for one call, normalized across vendors.
 *
 * **These numbers are not comparable across providers.** Every vendor tokenizes
 * differently, and they disagree about whether reasoning tokens are counted
 * inside output tokens. `docs/usage-normalization.md` records, per provider,
 * exactly what each field was mapped from and what it includes.
 */
export const usageSchema = z.object({
  /** Tokens in the prompt as the vendor counted them. */
  inputTokens: tokenCount,
  /** Tokens the model produced, as the vendor counted them. */
  outputTokens: tokenCount,
  /**
   * The vendor's own total where it reports one, otherwise input + output.
   * Kept separate rather than always derived because some vendors' totals do
   * not equal the sum of their parts.
   */
  totalTokens: tokenCount,
  /**
   * Tokens spent on internal reasoning, for models that report them.
   * `null` means the vendor does not report this, not that it was zero.
   * Whether these are *also* counted in `outputTokens` varies by vendor.
   */
  reasoningTokens: tokenCount.nullable().default(null),
  /**
   * Input tokens served from the vendor's prompt cache.
   * `null` means not reported. Relevant here mainly because the same short
   * prompt is sent repeatedly, so cache hits are common and change the cost.
   */
  cachedInputTokens: tokenCount.nullable().default(null),
})
export type Usage = z.infer<typeof usageSchema>

/**
 * How long one call took.
 *
 * Measured from a GitHub-hosted runner in an unspecified region, so it includes
 * DNS, TLS, network transit, and whatever queueing the provider was doing. It
 * is a measure of *the experience of calling this API from a generic cloud host*,
 * not of the model's inference speed.
 */
export const timingSchema = z.object({
  /** When the request was issued. */
  startedAt: isoTimestamp,
  /**
   * Time to first token, in milliseconds.
   * `null` for adapters that do not stream — there is no first token to observe
   * before the whole response arrives. `models.json` records which those are.
   */
  ttfbMs: durationMs.nullable().default(null),
  /** Wall-clock milliseconds from request issued to response fully read. */
  totalMs: durationMs,
})
export type Timing = z.infer<typeof timingSchema>

/**
 * One model answering one question, once.
 *
 * The benchmark takes several samples per model per question because LLM
 * responses are not deterministic; a single sample tells you what happened once.
 */
export const sampleSchema = z.object({
  /** Exactly what the model said, unmodified. The report quotes this verbatim. */
  text: z.string(),
  verdict: verdictSchema,
  /**
   * True when the normalized answer was exactly one word — the question asked
   * for one, so this measures instruction-following, not correctness.
   */
  followedInstruction: z.boolean(),
  usage: usageSchema,
  timing: timingSchema,
  /**
   * Estimated USD cost of this call, to 6 decimal places.
   * `null` when `models.json` has no pricing for the model. Always an estimate
   * from a dated pricing table, never a figure from a bill.
   */
  costEstimateUsd: z.number().nonnegative().nullable().default(null),
  /** The vendor's raw usage object, kept for debugging normalization decisions. */
  raw: z.unknown().optional(),
})
export type Sample = z.infer<typeof sampleSchema>

/** Median, min and max of one metric across a model's samples. */
export const statSchema = z.object({
  median: z.number(),
  min: z.number(),
  max: z.number(),
})
export type Stat = z.infer<typeof statSchema>

/**
 * A model's samples reduced to the numbers the report actually shows.
 *
 * Medians rather than means throughout: with three samples, one cold start or
 * one retried request would drag a mean somewhere misleading.
 */
export const aggregateSchema = z.object({
  sampleCount: z.number().int().nonnegative(),
  totalMs: statSchema.nullable(),
  /** `null` when no sample reported a first-token time. */
  ttfbMs: statSchema.nullable(),
  inputTokens: statSchema.nullable(),
  outputTokens: statSchema.nullable(),
  totalTokens: statSchema.nullable(),
  /** Output tokens per second of wall-clock time. `null` when it cannot be computed. */
  tokensPerSecond: statSchema.nullable(),
  /** The verdict a majority of samples gave. Ties resolve to `other`. */
  verdict: verdictSchema.nullable(),
  /** Share of samples that answered in exactly one word, 0..1. */
  followedInstructionRate: z.number().min(0).max(1).nullable(),
  /** Summed estimated cost across samples, or `null` when pricing is missing. */
  costEstimateUsd: z.number().nonnegative().nullable().default(null),
})
export type Aggregate = z.infer<typeof aggregateSchema>

/**
 * Everything one model did with one question this week.
 *
 * `status` is `ok` when every sample succeeded, `partial` when some did, and
 * `error` when none did. A model in `error` still appears in the report — a
 * provider outage is a result, and hiding it would quietly bias the archive.
 */
export const modelResultSchema = z
  .object({
    provider: z.string().min(1),
    modelId: z.string().min(1),
    displayName: z.string().min(1),
    status: z.enum(['ok', 'partial', 'error']),
    samples: z.array(sampleSchema),
    aggregate: aggregateSchema,
    /** Present when `status` is `error` or `partial`; describes the failure. */
    error: providerErrorSchema.nullable().default(null),
  })
  .superRefine((result, ctx) => {
    if (result.status === 'error' && result.samples.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['samples'],
        message: 'a model result with status "error" must have no samples',
      })
    }
    if (result.status !== 'error' && result.samples.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['samples'],
        message: `status "${result.status}" requires at least one sample`,
      })
    }
    if (result.status === 'error' && result.error === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['error'],
        message: 'a model result with status "error" must record why',
      })
    }
  })
export type ModelResult = z.infer<typeof modelResultSchema>

/** One question, as it was asked this week. */
export const questionSchema = z.object({
  /** Stable slug, e.g. `hot-dog`. Used in URLs, so it must not change. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'question id must be a lowercase slug'),
  /** The exact prompt sent, recorded per run so a reworded question is visible. */
  text: z.string().min(1),
})
export type Question = z.infer<typeof questionSchema>

/**
 * One condition, as it was defined the week the run happened.
 *
 * Recorded in the run rather than read from today's registry when rendering,
 * for the same reason `questions` is: a condition reworded later must not
 * retroactively change what an old edition claims to have asked.
 */
export const runConditionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'condition id must be a lowercase slug'),
  label: z.string().min(1),
  description: z.string().min(1),
  /** The template, before `{subject}` substitution. The rendered text is on each result. */
  systemPrompt: z.string().nullable().default(null),
  promptPrefix: z.string().nullable().default(null),
  promptSuffix: z.string().nullable().default(null),
  temperature: z.number().nullable().default(null),
})
export type RunCondition = z.infer<typeof runConditionSchema>

/**
 * Every model's results for one question under one condition — one cell of
 * the condition × question matrix.
 *
 * `prompt` and `systemPrompt` are the exact strings sent, after template
 * substitution. They are stored per cell rather than reconstructed from the
 * condition definition so that the archive records what was asked, not what
 * the current rendering code would produce.
 */
export const questionResultSchema = z.object({
  questionId: z.string().min(1),
  conditionId: z.string().min(1),
  /** The user message actually sent. */
  prompt: z.string().min(1),
  /** The system prompt actually sent, or null when the arm has none. */
  systemPrompt: z.string().nullable().default(null),
  models: z.array(modelResultSchema),
})
export type QuestionResult = z.infer<typeof questionResultSchema>

/** The version-1 cell: a question and its models, with no notion of a condition. */
export const questionResultV1Schema = z.object({
  questionId: z.string().min(1),
  models: z.array(modelResultSchema),
})
export type QuestionResultV1 = z.infer<typeof questionResultV1Schema>

/**
 * The fields every generation of the run file shares.
 *
 * Kept as a plain object so the version-1 and version-2 schemas below are
 * built from one definition rather than two copies that drift.
 */
const runBaseFields = {
  /** Unique id for this execution. Also the report's "document reference number". */
  runId: z.string().min(1),
  isoWeek: isoWeekSchema,
  startedAt: isoTimestamp,
  finishedAt: isoTimestamp,
  /** `package.json` version of the runner that produced this file. */
  runnerVersion: z.string().min(1),
  /** Commit the runner was built from, so a result can be traced to code. */
  gitSha: z.string().nullable().default(null),
  /**
   * True when the run replayed recorded fixtures instead of calling providers.
   * The site labels mock runs, because publishing simulated data unlabelled
   * would undermine the only thing this project is actually serious about.
   */
  isMock: z.boolean(),
  questions: z.array(questionSchema).min(1),
}

/** Checks shared by both generations: unique questions, results that reference them, sane clock. */
function refineRunBase(
  run: {
    questions: Question[]
    results: Array<{ questionId: string }>
    startedAt: string
    finishedAt: string
  },
  ctx: z.RefinementCtx,
): void {
  const questionIds = new Set(run.questions.map((q) => q.id))
  if (questionIds.size !== run.questions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['questions'],
      message: 'question ids must be unique within a run',
    })
  }
  run.results.forEach((result, index) => {
    if (!questionIds.has(result.questionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['results', index, 'questionId'],
        message: `results reference question "${result.questionId}", which is not in questions`,
      })
    }
  })
  if (Date.parse(run.finishedAt) < Date.parse(run.startedAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['finishedAt'],
      message: 'finishedAt is before startedAt',
    })
  }
}

/**
 * A run file as written under schema version 1.
 *
 * Still understood, never written. `parseBenchmarkRun` migrates one of these
 * to the current shape on read, so the committed archive is never rewritten
 * and a version-1 edition renders exactly as it did the week it was published.
 */
export const benchmarkRunV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    ...runBaseFields,
    results: z.array(questionResultV1Schema),
  })
  .superRefine(refineRunBase)
export type BenchmarkRunV1 = z.infer<typeof benchmarkRunV1Schema>

/**
 * One weekly edition of the benchmark, in the current shape.
 *
 * Written to `data/runs/<isoWeek>.json`. Re-running the same week overwrites
 * the file, so a re-run corrects an edition rather than creating a second one.
 */
export const benchmarkRunSchema = z
  .object({
    /** The schema generation this file was written under. See {@link SCHEMA_VERSION}. */
    schemaVersion: z.literal(SCHEMA_VERSION),
    ...runBaseFields,
    /** The conditions this edition ran, control first, as defined that week. */
    conditions: z.array(runConditionSchema).min(1),
    results: z.array(questionResultSchema),
  })
  .superRefine((run, ctx) => {
    refineRunBase(run, ctx)

    const conditionIds = new Set(run.conditions.map((c) => c.id))
    if (conditionIds.size !== run.conditions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions'],
        message: 'condition ids must be unique within a run',
      })
    }
    if (run.conditions[0]?.id !== CONTROL_CONDITION_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions', 0, 'id'],
        message: `the first condition must be "${CONTROL_CONDITION_ID}"`,
      })
    }

    const cells = new Set<string>()
    run.results.forEach((result, index) => {
      if (!conditionIds.has(result.conditionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['results', index, 'conditionId'],
          message: `results reference condition "${result.conditionId}", which is not in conditions`,
        })
      }
      const cell = `${result.conditionId} ${result.questionId}`
      if (cells.has(cell)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['results', index],
          message: `question "${result.questionId}" appears twice under condition "${result.conditionId}"`,
        })
      }
      cells.add(cell)
    })
  })
export type BenchmarkRun = z.infer<typeof benchmarkRunSchema>

/**
 * Parse a run file of any supported generation into the current shape.
 *
 * A version-1 file is validated against the version-1 schema and migrated;
 * a current file is validated as-is. Either way the caller gets a
 * {@link BenchmarkRun}, and the file on disk is untouched — migration happens
 * on read, never by rewriting history.
 *
 * `label` is normally the file path, so a validation failure in CI tells the
 * contributor which of thirty committed files is wrong.
 */
export function parseBenchmarkRun(input: unknown, label = 'benchmark run'): BenchmarkRun {
  const version = schemaVersionOf(input)

  if (version === 1) {
    const result = benchmarkRunV1Schema.safeParse(input)
    if (!result.success) {
      throw new Error(
        `${label} is not a valid benchmark run (schema version 1):\n${formatZodError(result.error)}`,
      )
    }
    return migrateRun(result.data)
  }

  if (version !== null && version > SCHEMA_VERSION) {
    throw new Error(
      `${label} was written by a newer runner (schema version ${version} > ${SCHEMA_VERSION}); update your checkout`,
    )
  }

  const result = benchmarkRunSchema.safeParse(input)
  if (!result.success) {
    throw new Error(`${label} is not a valid benchmark run:\n${formatZodError(result.error)}`)
  }
  return result.data
}

/** The declared schema version of an unvalidated run, or null when it has none. */
export function schemaVersionOf(input: unknown): number | null {
  if (typeof input !== 'object' || input === null) return null
  const version = (input as { schemaVersion?: unknown }).schemaVersion
  return typeof version === 'number' && Number.isInteger(version) ? version : null
}

/** Render a zod error as one `path: message` line per issue, sorted for stable output. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
    .sort()
    .join('\n')
}
