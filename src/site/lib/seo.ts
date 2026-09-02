/**
 * Titles, meta descriptions and structured data, built from the data.
 *
 * Every page describes itself with numbers that are also on the page: the
 * edition, the tally, who changed their mind. Two pages never share a
 * description, because a description that could describe any page describes
 * none of them. A build test asserts that.
 *
 * The structured data here is limited to three types, and each says only
 * what the HTML already says: an FAQPage on the home page, a Dataset per
 * edition, and a SoftwareSourceCode on the About page. Nothing is claimed
 * that a reader cannot verify on the page.
 *
 * Pure functions over run data, no I/O.
 */
import { CONTROL_CONDITION_ID } from '../../schema/conditions.ts'
import type { BenchmarkRun, ModelResult, RunCondition, Verdict } from '../../schema/run.ts'
import type { QuestionEntry } from '../../schema/questions.ts'
import { formatDate, formatEdition } from './format.ts'
import { consensusOf, questionHeadline } from './prose.ts'
import { questionShifts } from './sensitivity.ts'
import { REPO_URL } from './urls.ts'
import { getSite } from './data.ts'
import { siteNameCaps } from '../../schema/site.ts'

/** Search engines show about this much of a description before cutting it. */
export const DESCRIPTION_LIMIT = 160

const SITE_NAME = siteNameCaps(getSite())
const PUBLISHER = { '@type': 'Organization', ...getSite().publisher }

/**
 * Keep a description under the limit, cutting at a word boundary. The
 * descriptions below are written to fit; this is the guard for a fork whose
 * model names or question text run long.
 */
export function clampDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '')}.`
}

/** Plural helper: "1 edition", "3 editions". */
export function count(n: number, noun: string, plural = `${noun}s`): string {
  return `${n} ${n === 1 ? noun : plural}`
}

/** The subject without its article, capitalized: "a hot dog" becomes "Hot dog". */
export function subjectName(question: Pick<QuestionEntry, 'subject'>): string {
  const bare = question.subject.replace(/^(an?|the)\s+/i, '')
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

export interface Tally {
  yes: number
  no: number
  other: number
  /** Models that produced any verdict. */
  answering: number
}

/** How many models said what, counting only those that answered. */
export function tallyOf(results: ModelResult[]): Tally {
  const tally: Tally = { yes: 0, no: 0, other: 0, answering: 0 }
  for (const result of results) {
    const verdict = result.aggregate.verdict
    if (!verdict) continue
    tally[verdict] += 1
    tally.answering += 1
  }
  return tally
}

const VERDICT_WORD: Record<Verdict, string> = { yes: 'yes', no: 'no', other: 'hedged' }

/**
 * A tally as a clause: "6 of 11 models say yes, 5 say no", "all 11 models say
 * no", or "no model answered". Past tense for archive pages.
 */
export function tallyPhrase(results: ModelResult[], tense: 'say' | 'said' = 'say'): string {
  const tally = tallyOf(results)
  if (tally.answering === 0) return 'no model answered'
  const verb = tense
  const parts = (['yes', 'no', 'other'] as const)
    .filter((verdict) => tally[verdict] > 0)
    .sort((a, b) => tally[b] - tally[a])
  const [top, ...rest] = parts
  if (!top) return 'no model answered'
  if (rest.length === 0) {
    return `all ${count(tally.answering, 'model')} ${verb} ${VERDICT_WORD[top]}`
  }
  const lead = `${tally[top]} of ${count(tally.answering, 'model')} ${verb} ${VERDICT_WORD[top]}`
  const tail = rest.map((verdict) => `${tally[verdict]} ${verb} ${VERDICT_WORD[verdict]}`)
  return [lead, ...tail].join(', ')
}

/** The compact form for lists: "6 yes, 5 no". */
export function tallyShort(results: ModelResult[]): string {
  const tally = tallyOf(results)
  if (tally.answering === 0) return 'no answers'
  return (['yes', 'no', 'other'] as const)
    .filter((verdict) => tally[verdict] > 0)
    .map((verdict) => `${tally[verdict]} ${VERDICT_WORD[verdict]}`)
    .join(', ')
}

/** Up to `max` names in running text, then "and N more". */
export function nameList(names: string[], max = 3): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  if (names.length <= max) return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
  const shown = names.slice(0, max)
  return `${shown.join(', ')}, and ${count(names.length - max, 'more', 'more')}`
}

/** The models that changed at least one answer when a framing told them what to think. */
export function flippedNames(run: BenchmarkRun, questionId: string): string[] {
  return questionShifts(run, questionId)
    .filter((row) => row.movedAnywhere)
    .map((row) => row.model.displayName)
}

/** Whether the run compared anything: at least one model with a comparable arm. */
function hasComparison(run: BenchmarkRun, questionId: string): boolean {
  return questionShifts(run, questionId).some((row) =>
    row.cells.some((cell) => cell.shift.status !== 'incomparable'),
  )
}

const controlResults = (run: BenchmarkRun, questionId: string): ModelResult[] =>
  run.results.find(
    (cell) => cell.questionId === questionId && cell.conditionId === CONTROL_CONDITION_ID,
  )?.models ?? []

const resultsUnder = (run: BenchmarkRun, questionId: string, conditionId: string) =>
  run.results.find((cell) => cell.questionId === questionId && cell.conditionId === conditionId)
    ?.models ?? []

/** The number of samples per model, as most models in the cell recorded it. */
export function samplesPerModel(results: ModelResult[]): number {
  const counts = new Map<number, number>()
  for (const result of results) {
    const n = result.aggregate.sampleCount
    if (n > 0) counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  let best = 0
  let bestCount = 0
  for (const [n, c] of counts) {
    if (c > bestCount) {
      best = n
      bestCount = c
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------

/**
 * The home page title is the query people type, then the promise:
 * "Is a hot dog a sandwich? 11 AI models answer, every week".
 */
export function homeTitle(
  question: Pick<QuestionEntry, 'text'> | null,
  modelCount: number,
): string {
  const lead = question ? questionHeadline(question) : SITE_NAME
  return `${lead} ${count(modelCount, 'AI model')} answer, every week`
}

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

/** The front page: the lead question's tally, then the others in a word each. */
export function homeDescription(run: BenchmarkRun | null, questions: QuestionEntry[]): string {
  if (!run) {
    return clampDescription(
      `${count(questions.length, 'question')}, every major AI model, every week. No edition published yet.`,
    )
  }
  const asked = questions.filter((q) => controlResults(run, q.id).length > 0)
  const [first, ...rest] = asked
  if (!first) return clampDescription(`${formatEdition(run.isoWeek)}: no question was answered.`)
  const lead = `"${questionHeadline(first)}" ${formatEdition(run.isoWeek)}: ${tallyPhrase(controlResults(run, first.id))}.`
  const others = rest
    .map((q) => `${subjectName(q)}: ${tallyShort(controlResults(run, q.id))}.`)
    .join(' ')
  return clampDescription(`${lead} ${others} Then they are told the answer.`)
}

/** A report: the edition, the tally, and who changed their mind when told. */
export function reportDescription(run: BenchmarkRun | null, question: QuestionEntry): string {
  if (!run) {
    return clampDescription(
      `${question.reportTitle}: how AI models answer "${questionHeadline(question)}". No edition published yet.`,
    )
  }
  const results = controlResults(run, question.id)
  const lead = `"${questionHeadline(question)}" ${formatEdition(run.isoWeek)}: ${tallyPhrase(results)}.`
  if (!hasComparison(run, question.id)) return clampDescription(lead)
  const names = flippedNames(run, question.id)
  if (names.length === 0) return clampDescription(`${lead} Told the answer, nobody changed theirs.`)
  // Names when they fit, a count when they do not: a cut-off list of names
  // reads as a mistake, a count reads as a summary.
  const named = `${lead} Told the answer, ${nameList(names, 2)} changed theirs.`
  if (named.length <= DESCRIPTION_LIMIT) return named
  const compared = questionShifts(run, question.id).filter((row) =>
    row.cells.some((cell) => cell.shift.status !== 'incomparable'),
  ).length
  return clampDescription(`${lead} Told the answer, ${names.length} of ${compared} changed theirs.`)
}

/** A report under one framing: the system prompt, then the tally it produced. */
export function framingDescription(
  run: BenchmarkRun,
  question: QuestionEntry,
  condition: RunCondition,
  systemPrompt: string | null,
): string {
  const results = resultsUnder(run, question.id, condition.id)
  const told = systemPrompt ? `System prompt "${systemPrompt}"` : 'No system prompt'
  return clampDescription(
    `${told}, then "${questionHeadline(question)}": ${tallyPhrase(results)}. ${formatEdition(run.isoWeek)}, ${condition.label.toLowerCase()} framing.`,
  )
}

/** An edition's archive page: the date and one tally per question. */
export function editionDescription(run: BenchmarkRun, questions: QuestionEntry[]): string {
  const tallies = run.questions
    .map((asked) => {
      const question = questions.find((q) => q.id === asked.id)
      const name = question ? subjectName(question) : asked.id
      return `${name}: ${tallyShort(controlResults(run, asked.id))}`
    })
    .join('. ')
  const models = new Set(
    run.results.flatMap((cell) => cell.models.map((m) => m.provider + m.modelId)),
  ).size
  return clampDescription(
    `Published ${formatDate(run.finishedAt)}. ${tallies}. ${count(models, 'model')}, ${count(run.conditions.length, 'framing')}.`,
  )
}

/** One question's archived report: the edition and its tally, in the past tense. */
export function archivedQuestionDescription(run: BenchmarkRun, question: QuestionEntry): string {
  const results = controlResults(run, question.id)
  return clampDescription(
    `"${questionHeadline(question)}" ${formatEdition(run.isoWeek)} archive: ${tallyPhrase(results, 'said')}. The edition as published, never revised.`,
  )
}

/** The reports landing page: one verdict per question from the latest edition. */
export function reportsIndexDescription(
  run: BenchmarkRun | null,
  questions: QuestionEntry[],
): string {
  if (!run)
    return clampDescription(
      `${count(questions.length, 'report')}, one per question. No edition published yet.`,
    )
  const verdicts = questions
    .map((question) => {
      const consensus = consensusOf(controlResults(run, question.id))
      if (!consensus.verdict) return null
      return `${subjectName(question)} ${VERDICT_WORD[consensus.verdict]}`
    })
    .filter((v): v is string => v !== null)
  const lead = `${count(questions.length, 'full report')} from the ${formatEdition(run.isoWeek)} edition`
  const tail = 'Verdicts, latency, cost, and who changed their mind when told the answer.'
  if (verdicts.length === 0) return clampDescription(`${lead}, none with a consensus. ${tail}`)
  return clampDescription(`${lead}: ${verdicts.join(', ')}. ${tail}`)
}

/** The archive index: how many editions there are and which is latest. */
export function runsIndexDescription(runs: BenchmarkRun[]): string {
  const latest = runs[0]
  if (!latest) return 'Every edition of the benchmark, in full. None published yet.'
  return clampDescription(
    `${count(runs.length, 'edition')} published, the latest ${formatEdition(latest.isoWeek)} on ${formatDate(latest.finishedAt)}. Every edition in full, never revised.`,
  )
}

/** The history index: editions and questions. */
export function historyIndexDescription(runs: BenchmarkRun[], questions: QuestionEntry[]): string {
  const names = questions.map((q) => subjectName(q).toLowerCase()).join(', ')
  return clampDescription(
    `${count(runs.length, 'edition')} of ${count(questions.length, 'question')} (${names}): verdicts, latency, tokens and framing sensitivity, edition by edition.`,
  )
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

/** The plain-language answer to one question, as the FAQ states it. */
export function faqAnswer(run: BenchmarkRun, questionId: string): string {
  const results = controlResults(run, questionId)
  const consensus = consensusOf(results)
  if (consensus.total === 0) return `No model answered in ${formatEdition(run.isoWeek)}.`
  const byVerdict = (verdict: Verdict) =>
    results.filter((r) => r.aggregate.verdict === verdict).map((r) => r.displayName)
  const order = (['yes', 'no', 'other'] as const)
    .filter((verdict) => byVerdict(verdict).length > 0)
    .sort((a, b) => byVerdict(b).length - byVerdict(a).length)
  const sentences = order.map((verdict, index) => {
    const names = byVerdict(verdict)
    const head =
      index === 0 ? `${names.length} of ${count(consensus.total, 'model')}` : `${names.length}`
    return `${head} ${names.length === 1 ? 'says' : 'say'} ${VERDICT_WORD[verdict]} (${names.join(', ')}).`
  })
  const samples = samplesPerModel(results)
  const asked =
    samples > 0 ? ` Asked ${count(samples, 'time')} each in ${formatEdition(run.isoWeek)}.` : ''
  return `${sentences.join(' ')}${asked}`
}

/** schema.org FAQPage for the home page: one Question per enabled question asked. */
export function faqPageJsonLd(run: BenchmarkRun, questions: QuestionEntry[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions
      .filter((question) => controlResults(run, question.id).length > 0)
      .map((question) => ({
        '@type': 'Question',
        name: question.text,
        acceptedAnswer: { '@type': 'Answer', text: faqAnswer(run, question.id) },
      })),
  }
}

/** The run file an edition was published from, relative to the repository root. */
export function runFilePath(run: BenchmarkRun): string {
  return `data/runs/${run.editionKey ?? run.isoWeek}.json`
}

/** schema.org Dataset for one edition's archive page. */
export function editionDatasetJsonLd(
  run: BenchmarkRun,
  questions: QuestionEntry[],
  url: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${SITE_NAME}, ${formatEdition(run.isoWeek)} edition`,
    description: editionDescription(run, questions),
    url,
    datePublished: run.finishedAt,
    license: 'https://opensource.org/license/mit',
    isAccessibleForFree: true,
    creator: PUBLISHER,
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      // The raw file, not the GitHub page around it: the encoding says JSON,
      // so the URL must serve JSON.
      contentUrl: `${REPO_URL.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/main/${runFilePath(run)}`,
    },
  }
}

/** schema.org SoftwareSourceCode for the About page. */
export function softwareSourceCodeJsonLd(description: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description,
    codeRepository: REPO_URL,
    programmingLanguage: 'TypeScript',
    license: 'https://opensource.org/license/mit',
  }
}

/** A breadcrumb trail, so a result can show where a page sits in the site. */
export function breadcrumbJsonLd(
  origin: URL,
  trail: Array<{ name: string; path: string }>,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.path, origin).href,
    })),
  }
}

/** The site itself, once, on the home page. */
export function webSiteJsonLd(origin: URL, description: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin.href,
    description,
    inLanguage: 'en',
    publisher: PUBLISHER,
  }
}
