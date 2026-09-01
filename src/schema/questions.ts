/**
 * The questions registry — `questions.json` at the repository root.
 *
 * Adding a question is a data change, not a code change. Both the runner and
 * the site read this file; neither has a prompt hardcoded anywhere.
 *
 * Loading from disk lives in `src/data/registries.ts`. This module stays pure
 * so the same validation can run in a browser.
 */
import { z } from 'zod'

/**
 * Every question ends with this exact phrase.
 *
 * Enforced rather than merely conventional: the methodology page states the
 * prompt template once, and this is what makes that statement true for every
 * question in the archive. It is also what makes `followedInstruction`
 * meaningful — a one-word compliance rate only means something if one word was
 * actually asked for.
 */
export const ONE_WORD_SUFFIX = 'One word answer.'

export const questionEntrySchema = z.object({
  /** Stable lowercase slug. Appears in URLs, so changing one breaks history continuity. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'question id must be a lowercase slug like "hot-dog"'),
  /** The food, phrased to drop into the template: "a hot dog". Used in generated prose. */
  subject: z.string().min(1),
  /** The exact prompt sent to every model. */
  text: z
    .string()
    .min(1)
    .endsWith(ONE_WORD_SUFFIX, `question text must end with "${ONE_WORD_SUFFIX}"`),
  /** The deadpan analyst-register title the report page uses. */
  reportTitle: z.string().min(1),
  /** Disabled questions stay in the file (and in the archive) but are not asked. */
  enabled: z.boolean(),
  /** Editorial note, rendered nowhere. Context for whoever reads the registry. */
  notes: z.string().optional(),
})
export type QuestionEntry = z.infer<typeof questionEntrySchema>

export const questionsRegistrySchema = z
  .object({
    $schema: z.string().optional(),
    questions: z.array(questionEntrySchema).min(1),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>()
    registry.questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', index, 'id'],
          message: `duplicate question id "${question.id}"`,
        })
      }
      seen.add(question.id)
    })
  })
export type QuestionsRegistry = z.infer<typeof questionsRegistrySchema>

/** Validate a parsed `questions.json`, throwing a message that names the file. */
export function parseQuestionsRegistry(
  input: unknown,
  label = 'questions.json',
): QuestionsRegistry {
  const result = questionsRegistrySchema.safeParse(input)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
      .sort()
      .join('\n')
    throw new Error(`${label} is not a valid questions registry:\n${detail}`)
  }
  return result.data
}

/**
 * The questions that actually get asked, in file order.
 *
 * File order is the report order: the hot dog leads because it is the founding
 * question, not because of anything the data says.
 */
export function enabledQuestions(registry: QuestionsRegistry): QuestionEntry[] {
  return registry.questions.filter((question) => question.enabled)
}
