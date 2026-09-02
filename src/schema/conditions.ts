/**
 * The conditions registry — `conditions.json` at the repository root.
 *
 * A **condition** is a named variant of how a question is asked: an optional
 * system prompt, an optional prefix or suffix around the user message, and an
 * optional temperature. The benchmark asks every question under every enabled
 * condition, so the run matrix is condition × question × model × samples.
 *
 * ## Why this exists
 *
 * "Is a hot dog a sandwich?" measures one thing. The same question asked under
 * a system prompt that asserts the answer measures something far more useful:
 * how far a model's position moves when the framing moves. That property —
 * suggestibility under instruction — generalises to every real evaluation
 * anyone would build from this repository, unlike the sandwich question.
 *
 * ## The control condition
 *
 * The first entry must be `control`, and it must carry no system prompt, no
 * prefix, no suffix and no temperature. It is the baseline every other arm is
 * compared against, and it is exactly what the benchmark asked before
 * conditions existed — which is what makes editions written under schema
 * version 1 comparable with the control arm of later ones. A fork that wants
 * the cheap path disables every other condition and keeps this one.
 *
 * ## Templates
 *
 * A system prompt, prefix or suffix may contain `{subject}`, replaced at run
 * time with the question's subject ("a hot dog"). That is what lets one
 * `asserted` condition say "A hot dog is a sandwich." to the hot dog question
 * and "A taco is a sandwich." to the taco question, rather than telling every
 * model about hot dogs while asking about tacos. The rendered text actually
 * sent is recorded in the run file, so nothing is reconstructed later.
 *
 * This module stays pure so the same validation can run in a browser; loading
 * from disk lives in `src/data/registries.ts`.
 */
import { z } from 'zod'
import type { QuestionEntry } from './questions.ts'

/** The id the baseline arm must have. The site and the runner both key off it. */
export const CONTROL_CONDITION_ID = 'control'

/** The placeholder a template may use for the question's subject. */
export const SUBJECT_PLACEHOLDER = '{subject}'

export const conditionEntrySchema = z.object({
  /** Stable lowercase slug. Appears in run files and URLs, so changing one breaks continuity. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'condition id must be a lowercase slug like "asserted"'),
  /** Short human label for tables and chart legends. */
  label: z.string().min(1),
  /** One sentence saying what this arm changes and why. Rendered on the methodology page. */
  description: z.string().min(1),
  /**
   * System prompt template, or null for none.
   *
   * Sent through each vendor's own mechanism for system instructions — see
   * `docs/usage-normalization.md` for which field that is per provider.
   */
  systemPrompt: z.string().min(1).nullable().default(null),
  /** Text placed before the question in the user message, or null. */
  promptPrefix: z.string().min(1).nullable().default(null),
  /** Text placed after the question in the user message, or null. */
  promptSuffix: z.string().min(1).nullable().default(null),
  /** Sampling temperature to request, or null to leave the vendor default. */
  temperature: z.number().min(0).max(2).nullable().default(null),
  /** Disabled conditions stay in the file but are not run. */
  enabled: z.boolean(),
  /** Editorial note, rendered nowhere. */
  notes: z.string().optional(),
})
export type ConditionEntry = z.infer<typeof conditionEntrySchema>

/**
 * The control condition as a constant, for callers with no registry to hand —
 * the runner's default, the migration of version-1 runs, and tests.
 */
export const CONTROL_CONDITION: ConditionEntry = {
  id: CONTROL_CONDITION_ID,
  label: 'Control',
  description: 'The question exactly as written, with no system prompt.',
  systemPrompt: null,
  promptPrefix: null,
  promptSuffix: null,
  temperature: null,
  enabled: true,
}

/** True when a condition changes nothing about how the question is asked. */
export function isPlainCondition(condition: ConditionEntry): boolean {
  return (
    condition.systemPrompt === null &&
    condition.promptPrefix === null &&
    condition.promptSuffix === null &&
    condition.temperature === null
  )
}

export const conditionsRegistrySchema = z
  .object({
    $schema: z.string().optional(),
    conditions: z.array(conditionEntrySchema).min(1),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>()
    registry.conditions.forEach((condition, index) => {
      if (seen.has(condition.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['conditions', index, 'id'],
          message: `duplicate condition id "${condition.id}"`,
        })
      }
      seen.add(condition.id)
    })

    const [first] = registry.conditions
    if (!first || first.id !== CONTROL_CONDITION_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions', 0, 'id'],
        message: `the first condition must be "${CONTROL_CONDITION_ID}": it is the baseline every other arm is compared against`,
      })
      return
    }
    if (!isPlainCondition(first)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions', 0],
        message:
          'the control condition must have no system prompt, prefix, suffix or temperature — it is defined as the question asked plainly',
      })
    }
    if (!first.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions', 0, 'enabled'],
        message: 'the control condition cannot be disabled: every other arm is measured against it',
      })
    }
  })
export type ConditionsRegistry = z.infer<typeof conditionsRegistrySchema>

/** Validate a parsed `conditions.json`, throwing a message that names the file. */
export function parseConditionsRegistry(
  input: unknown,
  label = 'conditions.json',
): ConditionsRegistry {
  const result = conditionsRegistrySchema.safeParse(input)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
      .sort()
      .join('\n')
    throw new Error(`${label} is not a valid conditions registry:\n${detail}`)
  }
  return result.data
}

/** The conditions that actually run, in file order. The control always leads. */
export function enabledConditions(registry: ConditionsRegistry): ConditionEntry[] {
  return registry.conditions.filter((condition) => condition.enabled)
}

/**
 * Fill a template's `{subject}` placeholder for one question.
 *
 * The subject is stored lowercase ("a hot dog") so it drops into a sentence;
 * when the placeholder opens the template the first letter is capitalised so
 * "{subject} is a sandwich." renders as "A hot dog is a sandwich." rather than
 * starting a system prompt with a lowercase article.
 */
export function renderTemplate(template: string, question: Pick<QuestionEntry, 'subject'>): string {
  if (!template.includes(SUBJECT_PLACEHOLDER)) return template
  const rendered = template.split(SUBJECT_PLACEHOLDER).join(question.subject)
  return template.startsWith(SUBJECT_PLACEHOLDER)
    ? rendered.charAt(0).toUpperCase() + rendered.slice(1)
    : rendered
}

/** The system prompt actually sent for a question under a condition, or null. */
export function renderSystemPrompt(
  condition: ConditionEntry,
  question: Pick<QuestionEntry, 'subject'>,
): string | null {
  return condition.systemPrompt === null ? null : renderTemplate(condition.systemPrompt, question)
}

/**
 * The user message actually sent for a question under a condition.
 *
 * Prefix, question and suffix are joined with single spaces. The question text
 * itself is never altered, so the `One word answer.` instruction stays intact
 * and `followedInstruction` keeps its meaning under every condition.
 */
export function renderPrompt(
  condition: ConditionEntry,
  question: Pick<QuestionEntry, 'subject' | 'text'>,
): string {
  return [
    condition.promptPrefix === null ? null : renderTemplate(condition.promptPrefix, question),
    question.text,
    condition.promptSuffix === null ? null : renderTemplate(condition.promptSuffix, question),
  ]
    .filter((part): part is string => part !== null)
    .join(' ')
}
