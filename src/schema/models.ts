/**
 * The models registry — `models.json` at the repository root.
 *
 * **Model IDs live here and nowhere else.** No adapter ever hardcodes one. That
 * is what makes swapping a model, or adding a second model on the same provider,
 * a data change rather than a code change.
 *
 * Every entry records the documentation page its `modelId` was verified against
 * and the date its pricing was read, because both of those go stale and a cost
 * estimate from an undated price table is a number with no meaning.
 *
 * Loading from disk lives in `src/data/registries.ts`. This module stays pure
 * so the same validation can run in a browser.
 */
import { z } from 'zod'

/**
 * Per-million-token prices, and when they were read.
 *
 * Null pricing is allowed and means "we do not have a published per-token price
 * for this model" — the site shows a dash rather than a zero, because a model
 * with unknown cost is not a free model.
 */
export const pricingSchema = z.object({
  /** USD per million input tokens. */
  inputUsdPerMTok: z.number().nonnegative().nullable(),
  /** USD per million output tokens. */
  outputUsdPerMTok: z.number().nonnegative().nullable(),
  /** Where the price was published. */
  pricingUrl: z.string().url(),
  /** The date the price above was read, `YYYY-MM-DD`. Stamped on every cost estimate. */
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf must be YYYY-MM-DD'),
})
export type Pricing = z.infer<typeof pricingSchema>

export const modelEntrySchema = z.object({
  /** Provider id. Must match an adapter in `src/providers/registry.ts`. */
  provider: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'provider id must be a lowercase slug'),
  /** The literal string sent to the API. Copied from docs, never typed from memory. */
  modelId: z.string().min(1),
  /** Human label for the report. */
  displayName: z.string().min(1),
  /** The organization that made the model, which is not always who serves it. */
  vendor: z.string().min(1),
  /** The page `modelId` was verified against. Required — an unverified ID is a guess. */
  docsUrl: z.string().url(),
  pricing: pricingSchema,
  /**
   * Whether the adapter streams this model's response.
   * False means `ttfbMs` will be null for it, which the report shows as
   * "not reported" rather than as a zero or a missing row.
   */
  supportsStreaming: z.boolean(),
  /** Whether the API returns token counts. False means usage fields are best-effort. */
  supportsUsage: z.boolean(),
  /** Disabled models stay in the file (and in the archive) but are not asked. */
  enabled: z.boolean(),
  /** Why this model, what is odd about it, anything a reader should know. */
  notes: z.string().optional(),
})
export type ModelEntry = z.infer<typeof modelEntrySchema>

export const modelsRegistrySchema = z
  .object({
    $schema: z.string().optional(),
    models: z.array(modelEntrySchema).min(1),
  })
  .superRefine((registry, ctx) => {
    // The same model served by two providers is legitimate (an open-weights
    // model on two hosts is an interesting comparison); the same model on the
    // same provider twice is a copy-paste mistake that would double-count it.
    const seen = new Set<string>()
    registry.models.forEach((model, index) => {
      const key = `${model.provider}/${model.modelId}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['models', index, 'modelId'],
          message: `duplicate provider + modelId pair "${key}"`,
        })
      }
      seen.add(key)
    })
  })
export type ModelsRegistry = z.infer<typeof modelsRegistrySchema>

/** Validate a parsed `models.json`, throwing a message that names the file. */
export function parseModelsRegistry(input: unknown, label = 'models.json'): ModelsRegistry {
  const result = modelsRegistrySchema.safeParse(input)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
      .sort()
      .join('\n')
    throw new Error(`${label} is not a valid models registry:\n${detail}`)
  }
  return result.data
}

/** The models that actually get asked, in file order. */
export function enabledModels(registry: ModelsRegistry): ModelEntry[] {
  return registry.models.filter((model) => model.enabled)
}

/** Look up one entry by provider and model id, or `undefined`. */
export function findModel(
  registry: ModelsRegistry,
  provider: string,
  modelId: string,
): ModelEntry | undefined {
  return registry.models.find((m) => m.provider === provider && m.modelId === modelId)
}
