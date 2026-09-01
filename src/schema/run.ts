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

/**
 * Current schema version. Increment on any breaking change to the shapes below.
 *
 * Breaking means: an existing committed run file would stop validating. Adding
 * an optional field is not breaking; making a field required, removing one, or
 * narrowing a type is.
 */
export const SCHEMA_VERSION = 1

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
  /** Rate limited. Retried with backoff, honouring `Retry-After`. */
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

/** Every model's results for one question. */
export const questionResultSchema = z.object({
  questionId: z.string().min(1),
  models: z.array(modelResultSchema),
})
export type QuestionResult = z.infer<typeof questionResultSchema>

/**
 * One weekly edition of the benchmark.
 *
 * Written to `data/runs/<isoWeek>.json`. Re-running the same week overwrites
 * the file, so a re-run corrects an edition rather than creating a second one.
 */
export const benchmarkRunSchema = z
  .object({
    /** The schema generation this file was written under. See {@link SCHEMA_VERSION}. */
    schemaVersion: z.number().int().positive(),
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
    results: z.array(questionResultSchema),
  })
  .superRefine((run, ctx) => {
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
  })
export type BenchmarkRun = z.infer<typeof benchmarkRunSchema>

/**
 * Parse a run file, throwing a readable error that names the offending path.
 *
 * `label` is normally the file path, so a validation failure in CI tells the
 * contributor which of thirty committed files is wrong.
 */
export function parseBenchmarkRun(input: unknown, label = 'benchmark run'): BenchmarkRun {
  const result = benchmarkRunSchema.safeParse(input)
  if (!result.success) {
    throw new Error(`${label} is not a valid benchmark run:\n${formatZodError(result.error)}`)
  }
  return result.data
}

/** Render a zod error as one `path: message` line per issue, sorted for stable output. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
    .sort()
    .join('\n')
}
