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
  /**
   * The affirmative answer as a predicate on the subject: "is a sandwich".
   *
   * Site copy that names what the question asserts is built from this, so a
   * fork asking "Is a burrito a wrap?" reads "Tell them a burrito is a wrap"
   * rather than a sentence about sandwiches. Optional: without it the site
   * falls back to the condition labels and quotes the question text.
   */
  claim: z.string().min(1).optional(),
  /** The negative answer as a predicate on the subject: "is not a sandwich". */
  denial: z.string().min(1).optional(),
  /** The exact prompt sent to every model. */
  text: z
    .string()
    .min(1)
    .endsWith(ONE_WORD_SUFFIX, `question text must end with "${ONE_WORD_SUFFIX}"`),
  /** The report page's title. Short, and its own — no two questions share a shape. */
  reportTitle: z.string().min(1),
  /** One line under the title: what makes this question worth asking. */
  tagline: z.string().min(1).optional(),
  /** Disabled questions stay in the file (and in the archive) but are not asked. */
  enabled: z.boolean(),
  /**
   * Where the question is in its life. `proposed` is accepted and visible on
   * the site as "up next" but not yet asked; `live` is asked; `retired` stays
   * in the file for the archive's sake and is asked no more. Default `live`,
   * so every registry written before this field existed still means what it
   * meant.
   */
  status: z.enum(['proposed', 'live', 'retired']).default('live'),
  /**
   * Who sent the question in, when someone did. `credit` false means they
   * asked not to be named; the site then renders nothing. Silence is not
   * consent to be named: a question with no contributor is simply uncredited.
   */
  contributor: z
    .object({
      name: z.string().min(1),
      url: z.string().url().optional(),
      credit: z.boolean(),
    })
    .optional(),
  /**
   * How often the question runs. Every question runs in every edition by
   * default; `monthly` is the escape hatch for the day the bill says so, and
   * means the first edition of each calendar month.
   */
  cadence: z.enum(['every', 'monthly']).default('every'),
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
  return registry.questions.filter((question) => question.enabled && question.status === 'live')
}

/** Questions accepted but not yet asked: what the site shows as up next. */
export function proposedQuestions(registry: QuestionsRegistry): QuestionEntry[] {
  return registry.questions.filter((question) => question.status === 'proposed')
}

/**
 * Whether a question's cadence puts it in an edition run on this date.
 *
 * "The first edition of the month" for a weekly benchmark is the run whose
 * date falls in the month's first seven days: exactly one weekly run does.
 */
export function isDue(question: Pick<QuestionEntry, 'cadence'>, date: Date): boolean {
  if (question.cadence === 'every') return true
  return date.getUTCDate() <= 7
}

/** The enabled, live questions whose cadence is due on this date: what the runner asks. */
export function dueQuestions(registry: QuestionsRegistry, date: Date): QuestionEntry[] {
  return enabledQuestions(registry).filter((question) => isDue(question, date))
}

/** "Sent in by Ada Lovelace", or null when there is nobody to credit or they declined. */
export function creditLine(question: Pick<QuestionEntry, 'contributor'>): string | null {
  const contributor = question.contributor
  if (!contributor || !contributor.credit) return null
  return `Sent in by ${contributor.name}`
}
