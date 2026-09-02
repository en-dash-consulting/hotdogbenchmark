/**
 * `bench init`: point the benchmark at a new question.
 *
 * A fork that wants to ask "Is a burrito a sandwich?" instead of the hot dog
 * question has to change more than `questions.json`. The framing arms in
 * `conditions.json` are templates over the question's subject; the recorded
 * fixtures under `tests/fixtures/responses/` answer the old questions, and
 * mock mode would replay them as answers to the new ones; and any mock
 * edition under `data/runs/` describes a benchmark that no longer exists.
 * This command makes all of those changes together so none is forgotten.
 *
 * Two safety rules. Nothing is written until both registries validate, so a
 * bad id cannot leave the repository half-changed. And a real edition
 * (`isMock: false`) is data somebody paid for, so it is only removed with
 * `--force`; otherwise it is listed and left alone.
 */
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import type { ZodIssue } from 'zod'
import {
  ONE_WORD_SUFFIX,
  questionsRegistrySchema,
  type QuestionEntry,
  type QuestionsRegistry,
} from '../schema/questions.ts'
import {
  CONTROL_CONDITION,
  CONTROL_CONDITION_ID,
  SUBJECT_PLACEHOLDER,
  conditionsRegistrySchema,
  renderTemplate,
  type ConditionEntry,
  type ConditionsRegistry,
} from '../schema/conditions.ts'
import { loadConditionsRegistry, loadModels, REPO_ROOT } from '../data/registries.ts'
import { writeManifest } from '../data/index.ts'
import { RUNS_DIR } from '../data/paths.ts'
import { FIXTURE_DIR } from './mock-fixtures.ts'
import { readIsMock } from './run-command.ts'

export interface InitOptions {
  /** Question texts. Empty means prompt for them when stdin is a terminal. */
  questions: string[]
  /** One subject per question, paired by position: "a burrito". */
  subjects: string[]
  /** Optional ids, report titles and taglines, paired with questions by position. */
  ids: string[]
  titles: string[]
  taglines: string[]
  /**
   * System prompt templates for the asserted and denied arms. When absent the
   * templates already in conditions.json are kept, so a fork that only changes
   * the question keeps its framings.
   */
  assertTemplate?: string
  denyTemplate?: string
  /** False writes the control condition alone. */
  framings: boolean
  /** Allow real editions (isMock: false) to be removed. */
  force: boolean
  /** Skip the confirmation prompt. */
  yes: boolean
  /** Print what would change and write nothing. */
  dryRun: boolean
  root?: string
}

export const INIT_USAGE = `Usage: npm run bench -- init --question "<text>" --subject "<a burrito>" [options]

Run with no --question from a terminal to be prompted instead.

  --question <text>   The prompt to send (repeatable). "One word answer." is appended if missing
  --subject <phrase>  The subject as it reads in a sentence, like "a burrito" (repeatable, one per question)
  --id <slug>         Question id; default is the subject slugged without its article (repeatable)
  --title <text>      Report title; default is "The <Subject> Question" (repeatable)
  --tagline <text>    One line under the title (repeatable)
  --assert <template> System prompt for the asserted arm; "{subject}" is filled per question
  --deny <template>   System prompt for the denied arm
  --no-framings       Write the control condition only
  --force             Also remove real editions (isMock: false) under data/runs/
  --yes               Skip the confirmation prompt
  --dry-run           Print what would change and write nothing`

/** The framings shipped with the repository, used when conditions.json has none. */
const DEFAULT_ASSERT_TEMPLATE = `${SUBJECT_PLACEHOLDER} is a sandwich.`
const DEFAULT_DENY_TEMPLATE = `${SUBJECT_PLACEHOLDER} is not a sandwich.`

const ASSERTED_ID = 'asserted'
const DENIED_ID = 'denied'

/** "a hot dog" without its article. Case-insensitive so "A Hot Dog" works too. */
function stripArticle(subject: string): string {
  return subject.trim().replace(/^(a|an|the)\s+/i, '')
}

/** The default question id for a subject: "a hot dog" becomes "hot-dog". */
export function slugForSubject(subject: string): string {
  return stripArticle(subject)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The default report title for a subject: "a hot dog" becomes "The Hot Dog Question". */
export function defaultTitleFor(subject: string): string {
  const words = stripArticle(subject)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  return `The ${words.join(' ')} Question`
}

/** The question text with the mandatory closing instruction, added if it was missing. */
export function withOneWordSuffix(text: string): string {
  const trimmed = text.trim()
  return trimmed.endsWith(ONE_WORD_SUFFIX) ? trimmed : `${trimmed} ${ONE_WORD_SUFFIX}`
}

/** What the command intends to do, computed in full before anything is touched. */
interface InitPlan {
  questions: QuestionsRegistry
  conditions: ConditionsRegistry
  /** Ids of questions whose text had the suffix appended, so the output can say so. */
  suffixed: string[]
  /** Repository-relative paths that will be removed. */
  fixtures: string[]
  mockRuns: string[]
  /** Real editions, removed only with --force. */
  realRuns: string[]
}

export async function runInit(options: InitOptions): Promise<number> {
  const root = options.root ?? REPO_ROOT
  const interactive = Boolean(process.stdin.isTTY) && !process.env.CI
  const prompter = interactive ? createPrompter() : null

  try {
    let { questions, subjects, framings } = options
    if (questions.length === 0) {
      if (!prompter) {
        console.error(INIT_USAGE)
        return 2
      }
      const answers = await gatherInteractively(prompter)
      if (answers === null) {
        console.log('\nNothing written.')
        return 2
      }
      ;({ questions, subjects, framings } = answers)
    }

    if (subjects.length !== questions.length) {
      console.error(
        `Got ${questions.length} --question but ${subjects.length} --subject; pass one --subject per --question.\n\n${INIT_USAGE}`,
      )
      return 2
    }
    for (const [flag, values] of [
      ['--id', options.ids],
      ['--title', options.titles],
      ['--tagline', options.taglines],
    ] as const) {
      if (values.length > questions.length) {
        console.error(
          `More ${flag} values (${values.length}) than questions (${questions.length}).`,
        )
        return 2
      }
    }

    const plan = buildPlan(root, { ...options, questions, subjects, framings })
    if (plan === null) return 2

    printPlan(plan, options.force)

    if (options.dryRun) {
      console.log('Dry run: nothing written.')
      return 0
    }

    if (!options.yes) {
      if (!prompter) {
        console.error('Refusing to write without confirmation. Pass --yes, or run from a terminal.')
        return 2
      }
      const answer = await prompter.ask('Write these changes? [y/N] ')
      if (answer === null || !/^y(es)?$/i.test(answer.trim())) {
        console.log('Nothing written.')
        return 2
      }
    }

    return apply(root, plan, options.force)
  } finally {
    prompter?.close()
  }
}

/**
 * Turn the options into validated registries and a list of files to remove.
 * Returns null after printing the problem, so the caller can exit 2 with
 * nothing on disk changed.
 */
function buildPlan(root: string, options: InitOptions): InitPlan | null {
  const suffixed: string[] = []
  const questions = options.questions.map((rawText, index) => {
    const subject = options.subjects[index]!.trim()
    const id = options.ids[index] ?? slugForSubject(subject)
    const text = withOneWordSuffix(rawText)
    if (text !== rawText.trim()) suffixed.push(id)
    const tagline = options.taglines[index]
    // Key order here is file order: the registry is read by people as well as
    // by the schema, and a stable layout keeps its diffs small.
    return {
      id,
      subject,
      text,
      reportTitle: options.titles[index] ?? defaultTitleFor(subject),
      ...(tagline === undefined ? {} : { tagline }),
      enabled: true,
    }
  })

  const questionsResult = questionsRegistrySchema.safeParse({
    $schema: './src/schema/questions.ts',
    questions,
  })
  if (!questionsResult.success) {
    console.error(
      `questions.json would not validate:\n${formatIssues(questionsResult.error.issues)}`,
    )
    return null
  }

  const conditionsResult = conditionsRegistrySchema.safeParse({
    $schema: './src/schema/conditions.ts',
    conditions: buildConditions(root, options, questionsResult.data.questions[0]!),
  })
  if (!conditionsResult.success) {
    console.error(
      `conditions.json would not validate:\n${formatIssues(conditionsResult.error.issues)}`,
    )
    return null
  }

  const runs = scanRuns(root)
  return {
    questions: questionsResult.data,
    conditions: conditionsResult.data,
    suffixed,
    fixtures: listFixtures(root),
    mockRuns: runs.mock,
    realRuns: runs.real,
  }
}

/**
 * The control, then the two framings unless they were turned off.
 *
 * The control's prose and each framing's label and notes are carried over from
 * the current conditions.json when it has them, so a fork's own wording
 * survives; only the parts that mention the old question are regenerated.
 */
function buildConditions(
  root: string,
  options: InitOptions,
  first: QuestionEntry,
): Record<string, unknown>[] {
  const existing = readExistingConditions(root)
  const previous = (id: string) => existing.find((condition) => condition.id === id)

  const control = previous(CONTROL_CONDITION_ID) ?? CONTROL_CONDITION
  const conditions = [conditionRecord(control)]
  if (!options.framings) return conditions

  const assertTemplate =
    options.assertTemplate ?? previous(ASSERTED_ID)?.systemPrompt ?? DEFAULT_ASSERT_TEMPLATE
  const denyTemplate =
    options.denyTemplate ?? previous(DENIED_ID)?.systemPrompt ?? DEFAULT_DENY_TEMPLATE

  const framing = (id: string, label: string, template: string, what: string): ConditionEntry => ({
    ...CONTROL_CONDITION,
    id,
    label: previous(id)?.label ?? label,
    description:
      `A system prompt ${what} before the question is asked: ` +
      JSON.stringify(renderTemplate(template, first)),
    systemPrompt: template,
    ...(previous(id)?.notes === undefined ? {} : { notes: previous(id)!.notes }),
  })
  conditions.push(
    conditionRecord(framing(ASSERTED_ID, 'Asserted', assertTemplate, 'states the claim as fact')),
    conditionRecord(framing(DENIED_ID, 'Denied', denyTemplate, 'denies the claim')),
  )
  return conditions
}

/** A condition in the key order the file uses, with no undefined fields. */
function conditionRecord(condition: ConditionEntry): Record<string, unknown> {
  return {
    id: condition.id,
    label: condition.label,
    description: condition.description,
    systemPrompt: condition.systemPrompt,
    promptPrefix: condition.promptPrefix,
    promptSuffix: condition.promptSuffix,
    temperature: condition.temperature,
    reasoningEffort: condition.reasoningEffort,
    enabled: condition.enabled,
    ...(condition.notes === undefined ? {} : { notes: condition.notes }),
  }
}

/**
 * The conditions currently on disk, or none. A missing or invalid file is not
 * an error here: this command is about to replace it.
 */
function readExistingConditions(root: string): ConditionEntry[] {
  try {
    return loadConditionsRegistry(root).conditions
  } catch {
    return []
  }
}

function formatIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
    .sort()
    .join('\n')
}

/** Every file under the fixture directory, as repository-relative paths. */
function listFixtures(root: string): string[] {
  return listFiles(root, FIXTURE_DIR)
}

/** Editions under data/runs, split by whether they are mock data. */
function scanRuns(root: string): { mock: string[]; real: string[] } {
  const mock: string[] = []
  const real: string[] = []
  for (const path of listFiles(root, RUNS_DIR).filter((name) => name.endsWith('.json'))) {
    // Only a file that says it is mock data is treated as mock data. One that
    // cannot be read is kept with the real ones: deleting it would destroy
    // whatever evidence it holds about what went wrong.
    if (readIsMock(join(root, path)) === true) mock.push(path)
    else real.push(path)
  }
  return { mock, real }
}

/** Plain files directly inside a directory, sorted, as repository-relative paths. */
function listFiles(root: string, dir: string): string[] {
  let names: string[]
  try {
    names = readdirSync(join(root, dir))
  } catch {
    // A missing directory has nothing to remove.
    return []
  }
  return names
    .filter((name) => statSync(join(root, dir, name)).isFile())
    .sort()
    .map((name) => `${dir}/${name}`)
}

function printPlan(plan: InitPlan, force: boolean): void {
  const { questions } = plan.questions
  console.log(`Questions (${questions.length}):`)
  const width = Math.max(...questions.map((q) => q.id.length))
  for (const question of questions) {
    console.log(`  ${question.id.padEnd(width)}  ${question.text}`)
    console.log(`  ${''.padEnd(width)}  ${question.reportTitle}`)
  }
  if (plan.suffixed.length > 0) {
    console.log(`  Appended "${ONE_WORD_SUFFIX}" to: ${plan.suffixed.join(', ')}`)
  }

  const { conditions } = plan.conditions
  console.log(`\nConditions (${conditions.length}): ${conditions.map((c) => c.id).join(', ')}`)
  for (const condition of conditions) {
    if (condition.systemPrompt === null) continue
    // Rendered against the first question so the reader sees the actual
    // system prompt, and the template so they can see how it will vary.
    console.log(
      `  ${condition.id.padEnd(10)} ${JSON.stringify(renderTemplate(condition.systemPrompt, questions[0]!))}` +
        `  (template ${JSON.stringify(condition.systemPrompt)})`,
    )
    if (!condition.systemPrompt.includes(SUBJECT_PLACEHOLDER) && questions.length > 1) {
      console.log(
        `             note: this template has no ${SUBJECT_PLACEHOLDER}, so every question gets the same prompt`,
      )
    }
  }

  const removing = [
    ...plan.fixtures,
    ...plan.mockRuns.map((path) => `${path} (mock)`),
    ...(force ? plan.realRuns.map((path) => `${path} (real, --force)`) : []),
  ]
  console.log(`\nWill remove (${removing.length}):`)
  for (const entry of removing) console.log(`  ${entry}`)
  if (removing.length === 0) console.log('  (nothing)')

  if (!force && plan.realRuns.length > 0) {
    console.log(`\nReal editions kept (pass --force to remove them):`)
    for (const path of plan.realRuns) console.log(`  ${path}`)
  }
  console.log('')
}

/** Write the registries, remove the stale files, and refresh the manifest. */
function apply(root: string, plan: InitPlan, force: boolean): number {
  writeFileSync(join(root, 'questions.json'), JSON.stringify(plan.questions, null, 2) + '\n')
  writeFileSync(join(root, 'conditions.json'), JSON.stringify(plan.conditions, null, 2) + '\n')
  console.log('Wrote questions.json')
  console.log('Wrote conditions.json')

  const removed = [...plan.fixtures, ...plan.mockRuns, ...(force ? plan.realRuns : [])]
  for (const path of removed) unlinkSync(join(root, path))
  console.log(`Removed ${removed.length} file${removed.length === 1 ? '' : 's'}`)

  // The manifest lists every remaining edition. The directory is created so a
  // fork that had no data/ yet still gets a valid, empty index.
  mkdirSync(join(root, RUNS_DIR), { recursive: true })
  try {
    const manifest = writeManifest(root)
    console.log(`Wrote ${manifest.path} (${manifest.runs} run${manifest.runs === 1 ? '' : 's'})`)
  } catch (error) {
    console.error(
      `Could not regenerate data/index.json: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
  }

  if (!force && plan.realRuns.length > 0) {
    console.log(
      `\nWarning: ${plan.realRuns.length} real edition${plan.realRuns.length === 1 ? '' : 's'} ` +
        'still answer the old questions. Re-run with --force to remove them.',
    )
  }

  printNextSteps(root)
  return 0
}

function printNextSteps(root: string): void {
  let providers: string[] = []
  try {
    providers = [...new Set(loadModels(root).map((model) => model.provider))]
  } catch {
    // No usable models.json means no providers to record from; the mock and
    // dev steps still apply.
  }
  console.log('\nNext:')
  for (const provider of providers) {
    console.log(`  npm run bench:record -- --provider ${provider}`)
  }
  console.log('  npm run bench -- run --mock --out tmp/mock-run.json')
  console.log('  npm run dev')
}

/** Asks questions on the terminal; `ask` resolves to null once input is closed. */
interface Prompter {
  ask(query: string): Promise<string | null>
  close(): void
}

function createPrompter(): Prompter {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let closed = false
  const whenClosed = new Promise<null>((resolve) => {
    rl.once('close', () => {
      closed = true
      resolve(null)
    })
  })
  // Ctrl-C closes the interface instead of killing the process, so every
  // pending question resolves to null and the caller reports that nothing
  // was written rather than dying mid-prompt.
  rl.on('SIGINT', () => rl.close())
  return {
    ask: (query) =>
      closed ? Promise.resolve(null) : Promise.race([rl.question(query), whenClosed]),
    close: () => {
      if (!closed) rl.close()
    },
  }
}

/**
 * Collect questions, subjects and the framing choice from the terminal.
 * Returns null when the user closed the input before finishing.
 */
async function gatherInteractively(
  prompter: Prompter,
): Promise<Pick<InitOptions, 'questions' | 'subjects' | 'framings'> | null> {
  const questions: string[] = []
  for (;;) {
    const answer = await prompter.ask(`Question ${questions.length + 1} (blank line to finish): `)
    if (answer === null) return null
    if (answer.trim() === '') break
    questions.push(answer.trim())
  }
  if (questions.length === 0) {
    console.log('No questions given.')
    return null
  }

  const subjects: string[] = []
  for (const question of questions) {
    const answer = await prompter.ask(
      `Subject of ${JSON.stringify(question)}, as it reads in a sentence (like "a burrito"): `,
    )
    if (answer === null || answer.trim() === '') return null
    subjects.push(answer.trim())
  }

  const keep = await prompter.ask('Keep the asserted and denied framings? [Y/n] ')
  if (keep === null) return null
  const framings = !/^n(o)?$/i.test(keep.trim())
  console.log('')
  return { questions, subjects, framings }
}
