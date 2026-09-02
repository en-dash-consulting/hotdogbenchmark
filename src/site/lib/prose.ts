/**
 * Analyst prose, generated at build time from the data.
 *
 * Every sentence here is assembled from numbers that are also shown elsewhere
 * on the page, so the prose can never contradict the tables. Templates rather
 * than freeform text, because a report that summarized its own data
 * inaccurately would undermine the one thing this project takes seriously.
 *
 * Register: the flat, hedged, faintly self-important voice of a subscription
 * research note. It never acknowledges that the subject is a hot dog. That
 * contrast is the entire joke, and it only works if the prose plays it
 * completely straight.
 */
import { CONTROL_CONDITION_ID } from '../../schema/conditions.ts'
import { ONE_WORD_SUFFIX } from '../../schema/questions.ts'
import type { QuestionEntry } from '../../schema/questions.ts'
import type { BenchmarkRun, ModelResult, Verdict } from '../../schema/run.ts'
import { scoreModels } from './scores.ts'
import { questionShifts, treatedConditions } from './sensitivity.ts'

/**
 * Copy about the topic itself: what the question claims, and how a framing
 * is described in plain words.
 *
 * Everything here reads `claim` and `denial` from the questions registry, so
 * a fork that asks "Is a burrito a wrap?" gets "Tell them a burrito is a wrap"
 * on the answer board without touching a component. When the registry does
 * not say, the copy falls back to the condition's own label and never invents
 * a predicate.
 */

/** The question as a heading: its text without the one-word instruction. */
export function questionHeadline(question: Pick<QuestionEntry, 'text'>): string {
  return question.text.endsWith(ONE_WORD_SUFFIX)
    ? question.text.slice(0, -ONE_WORD_SUFFIX.length).trim()
    : question.text
}

/** The condition ids that state an answer, and which registry field states it. */
const FRAMING_FIELD: Record<string, 'claim' | 'denial'> = {
  asserted: 'claim',
  denied: 'denial',
}

/**
 * What a framing tells the model about the subject: "is a sandwich" under the
 * asserted arm, "is not a sandwich" under the denied one. Null for the control,
 * for an arm the registry has no predicate for, and for a question that does
 * not declare one.
 */
export function framingClaim(
  question: Pick<QuestionEntry, 'claim' | 'denial'>,
  conditionId: string,
): string | null {
  const field = FRAMING_FIELD[conditionId]
  return field ? (question[field] ?? null) : null
}

/**
 * The answer board's framing switch, in plain words: "Just ask", then
 * "Tell them a hot dog is a sandwich". An arm with no predicate keeps the
 * label it has in the registry.
 */
export function framingLabel(
  question: Pick<QuestionEntry, 'subject' | 'claim' | 'denial'>,
  condition: { id: string; label: string },
): string {
  if (condition.id === CONTROL_CONDITION_ID) return 'Just ask'
  const claim = framingClaim(question, condition.id)
  return claim ? `Tell them ${question.subject} ${claim}` : condition.label
}

/** Small counts in words, the way the rest of the copy writes them. */
const SMALL_NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
]

/** One line for the feed channels, built from the questions actually asked. */
export function feedDescription(questions: QuestionEntry[]): string {
  const [first, ...rest] = questions
  if (!first) return 'Weekly cross-vendor evaluation of one-word questions.'
  const topic = first.claim
    ? `whether ${first.subject} ${first.claim}`
    : `the question ${questionHeadline(first)}`
  const more =
    rest.length === 0
      ? ''
      : rest.length === 1
        ? ', and one more'
        : `, and ${SMALL_NUMBERS[rest.length] ?? rest.length} more`
  return `Weekly cross-vendor evaluation of ${topic}${more}.`
}

/** How a verdict is written in running prose. */
const VERDICT_NOUN: Record<Verdict, string> = {
  yes: 'affirmative',
  no: 'negative',
  other: 'non-committal',
}

export interface SummaryInput {
  /** The subject, phrased to drop into a sentence: "a hot dog". */
  subject: string
  results: ModelResult[]
}

export interface Consensus {
  verdict: Verdict | null
  /** Models holding the majority position. */
  count: number
  /** Models that produced any answer at all. */
  total: number
  /** 0..1 share of answering models holding the majority position. */
  share: number
  /** True when every answering model agreed. */
  unanimous: boolean
  /** Models holding a different position from the majority. */
  dissenters: ModelResult[]
}

/** Where the field landed on a question. */
export function consensusOf(results: ModelResult[]): Consensus {
  const answering = results.filter((result) => result.aggregate.verdict !== null)
  const counts: Record<Verdict, number> = { yes: 0, no: 0, other: 0 }
  for (const result of answering) counts[result.aggregate.verdict!] += 1

  const ranked = (Object.entries(counts) as Array<[Verdict, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  const [top, runnerUp] = ranked
  // A tie has no consensus. Reporting either side as "the consensus" would be
  // inventing agreement that the data does not show.
  const verdict = !top || (runnerUp && runnerUp[1] === top[1]) ? null : top[0]

  return {
    verdict,
    count: verdict ? counts[verdict] : 0,
    total: answering.length,
    share: verdict && answering.length > 0 ? counts[verdict] / answering.length : 0,
    unanimous: Boolean(verdict) && answering.length > 0 && counts[verdict!] === answering.length,
    dissenters: verdict
      ? answering.filter((result) => result.aggregate.verdict !== verdict)
      : answering,
  }
}

const list = (names: string[]): string => {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

const percent = (value: number): string => `${Math.round(value * 100)}%`

/** Median latency in a form that reads well mid-sentence. */
function latencyPhrase(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} seconds`
}

/**
 * The two-or-three sentence executive summary at the top of a report.
 *
 * Handles four shapes of run explicitly: nothing answered, unanimous, a clear
 * majority with dissent, and a genuinely split field.
 */
export function executiveSummary({ subject, results }: SummaryInput): string {
  const answering = results.filter((result) => result.samples.length > 0)

  if (answering.length === 0) {
    return `No model returned a usable response this week, so nobody knows what ${subject} is. Check back next edition.`
  }

  const consensus = consensusOf(results)
  const errored = results.filter((result) => result.status === 'error')
  const sentences: string[] = []

  if (consensus.unanimous && consensus.verdict) {
    sentences.push(
      `The field is unanimous: all ${consensus.total} models gave ${subject} a ${VERDICT_NOUN[consensus.verdict]} answer.`,
    )
  } else if (consensus.verdict) {
    const dissenting = consensus.dissenters.map((result) => result.displayName)
    sentences.push(
      `A ${VERDICT_NOUN[consensus.verdict]} answer on ${subject} has majority support this week: ${consensus.count} of ${consensus.total} models (${percent(consensus.share)}).`,
    )
    if (dissenting.length > 0) {
      sentences.push(`${list(dissenting)} ${dissenting.length === 1 ? 'disagrees' : 'disagree'}.`)
    }
  } else {
    sentences.push(
      `The ${consensus.total} models are split on ${subject}, with no answer in the lead.`,
    )
  }

  // A performance observation, which is what makes it read as an analyst note
  // rather than a summary of one number.
  const fastest = [...answering]
    .filter((result) => result.aggregate.totalMs)
    .sort((a, b) => a.aggregate.totalMs!.median - b.aggregate.totalMs!.median)[0]
  const compliance = complianceRate(answering)

  if (fastest?.aggregate.totalMs) {
    sentences.push(
      `${fastest.displayName} was quickest, at a median ${latencyPhrase(fastest.aggregate.totalMs.median)}.`,
    )
  }
  if (compliance !== null && compliance < 1) {
    sentences.push(`${percent(compliance)} of answers were actually one word, as asked.`)
  }
  if (errored.length > 0) {
    sentences.push(
      `${list(errored.map((result) => result.displayName))} ${errored.length === 1 ? 'was' : 'were'} unavailable and ${errored.length === 1 ? 'is' : 'are'} left out of the above.`,
    )
  }

  return sentences.join(' ')
}

/** Share of samples across the field that answered in exactly one word. */
export function complianceRate(results: ModelResult[]): number | null {
  const rates = results
    .map((result) => result.aggregate.followedInstructionRate)
    .filter((value): value is number => value !== null)
  if (rates.length === 0) return null
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

export interface Finding {
  /** Short label, used as the bullet's lead-in. */
  label: string
  text: string
}

/**
 * Four to six bullets of analyst observation.
 *
 * Each is generated only when the data supports it, so a quiet week produces
 * fewer findings rather than padded ones. The floor is whatever the run can
 * honestly support.
 */
export function keyFindings({ subject, results }: SummaryInput): Finding[] {
  const answering = results.filter((result) => result.samples.length > 0)
  if (answering.length === 0) {
    return [
      {
        label: 'Data collection',
        text: `No provider returned a usable response for ${subject} this week. Nothing to report.`,
      },
    ]
  }

  const findings: Finding[] = []
  const consensus = consensusOf(results)

  if (consensus.unanimous && consensus.verdict) {
    findings.push({
      label: 'Consensus',
      text: `Everyone agrees: ${subject} gets a ${VERDICT_NOUN[consensus.verdict]} from every model, unanimous. That does not happen often.`,
    })
  } else if (consensus.verdict) {
    findings.push({
      label: 'Consensus',
      text: `${percent(consensus.share)} of models (${consensus.count} of ${consensus.total}) say ${VERDICT_NOUN[consensus.verdict]}.`,
    })
  } else {
    findings.push({
      label: 'No consensus',
      text: `Split decision on ${subject}. No answer is in the lead, so do not call it settled.`,
    })
  }

  const dissent = consensus.dissenters
  if (dissent.length > 0 && consensus.verdict) {
    findings.push({
      label: 'Dissent',
      text: `${list(dissent.map((r) => r.displayName))} went the other way.`,
    })
  }

  const withLatency = answering.filter((result) => result.aggregate.totalMs)
  if (withLatency.length >= 2) {
    const sorted = [...withLatency].sort(
      (a, b) => a.aggregate.totalMs!.median - b.aggregate.totalMs!.median,
    )
    const fastest = sorted[0]!
    const slowest = sorted.at(-1)!
    const multiple = slowest.aggregate.totalMs!.median / fastest.aggregate.totalMs!.median
    findings.push({
      label: 'Response latency',
      text: `${fastest.displayName} answered in a median ${latencyPhrase(fastest.aggregate.totalMs!.median)}; ${slowest.displayName} took ${latencyPhrase(slowest.aggregate.totalMs!.median)}. That is a ${multiple.toFixed(1)}× spread, mostly thinking time.`,
    })
  }

  const withTokens = answering.filter((result) => result.aggregate.outputTokens)
  if (withTokens.length >= 2) {
    const verbose = [...withTokens].sort(
      (a, b) => b.aggregate.outputTokens!.median - a.aggregate.outputTokens!.median,
    )[0]!
    if (verbose.aggregate.outputTokens!.median > 1) {
      findings.push({
        label: 'Response length',
        text: `${verbose.displayName} used the most output tokens, a median of ${Math.round(verbose.aggregate.outputTokens!.median)}, for a question that asked for one word.`,
      })
    }
  }

  const nonCompliant = answering.filter(
    (result) => (result.aggregate.followedInstructionRate ?? 1) < 1,
  )
  if (nonCompliant.length > 0) {
    findings.push({
      label: 'One-word compliance',
      text: `${list(nonCompliant.map((r) => r.displayName))} did not always keep it to one word. Following the instruction and picking an answer are scored separately; they are different skills.`,
    })
  } else {
    findings.push({
      label: 'One-word compliance',
      text: 'Every model kept it to one word. Nice.',
    })
  }

  const errored = results.filter((result) => result.status === 'error')
  if (errored.length > 0) {
    findings.push({
      label: 'Provider availability',
      text: `${list(errored.map((r) => r.displayName))} returned nothing usable this week. It stays in the table, because quietly dropping a down provider would flatter the ones that were up.`,
    })
  }

  const scored = scoreModels(answering).sort((a, b) => b.composite - a.composite)
  const leader = scored[0]
  if (leader && scored.length >= 2) {
    findings.push({
      label: 'Composite standing',
      text: `${leader.result.displayName} tops the composite score at ${leader.composite.toFixed(2)}, a made-up blend of decisiveness and efficiency that the methodology page spells out.`,
    })
  }

  // Six is the ceiling: beyond that a findings list stops being a summary.
  return findings.slice(0, 6)
}

/** A one-line analyst verdict for a vendor scorecard. */
export function vendorVerdictLine(result: ModelResult, peers: ModelResult[]): string {
  if (result.status === 'error') {
    return 'Unavailable this week, so nothing to say.'
  }

  const scored = scoreModels(peers).find(
    (entry) => entry.result.provider === result.provider && entry.result.modelId === result.modelId,
  )
  const decisive = (scored?.decisiveness ?? 0) >= 0.75
  const efficient = (scored?.efficiency ?? 0) >= 0.6

  if (decisive && efficient) {
    return 'Picks an answer and returns it promptly. Conviction and speed.'
  }
  if (decisive) {
    return 'Picks a clear answer but takes its time. Conviction over speed.'
  }
  if (efficient) {
    return 'Fast and cheap, but will not commit to an answer. Speed over conviction.'
  }
  return 'Neither decisive nor especially quick this week. Give it another edition.'
}

/** How a verdict is written as a position: "a negative position". */
const VERDICT_POSITION: Record<Verdict, string> = {
  yes: 'affirmative',
  no: 'negative',
  other: 'non-committal',
}

/**
 * The framing-sensitivity paragraph for one question.
 *
 * One sentence per non-control arm saying who moved and from what to what,
 * then one on who held. Written so that neither moving nor holding reads as
 * the better outcome — the methodology page makes that explicit, and this
 * prose must not undercut it.
 */
export function framingSummary(
  run: BenchmarkRun,
  questionId: string,
  question: Pick<QuestionEntry, 'subject' | 'claim' | 'denial'>,
): string {
  const rows = questionShifts(run, questionId)
  const arms = treatedConditions(run)
  if (arms.length === 0) return ''

  const { subject } = question
  const sentences: string[] = []

  for (const arm of arms) {
    const cells = rows
      .map((row) => ({ row, cell: row.cells.find((c) => c.condition.id === arm.id)! }))
      .filter(({ cell }) => cell.shift.status !== 'incomparable')
    if (cells.length === 0) {
      sentences.push(
        `Under the ${arm.label.toLowerCase()} framing there was nothing to compare against the control.`,
      )
      continue
    }
    // "Told a hot dog is a sandwich, ..." when the registry states the claim;
    // otherwise the arm is named and the subject closes the sentence.
    const claim = framingClaim(question, arm.id)
    const opening = claim
      ? `Told ${subject} ${claim}`
      : `Under the ${arm.label.toLowerCase()} framing`
    const closing = claim ? '' : ` on ${subject}`
    const moved = cells.filter(({ cell }) => cell.shift.status === 'moved')
    if (moved.length === 0) {
      sentences.push(
        cells.length === 1
          ? `${opening}, the only comparable model stuck with its original answer${closing}.`
          : `${opening}, all ${cells.length} models stuck with their original answer${closing}.`,
      )
      continue
    }
    // Where they landed, not who they were. Naming seven models inline made a
    // paragraph nobody read; the position matrix directly below this says who,
    // per arm, and says it in a table, which is the right shape for a list.
    const byDestination = new Map<Verdict, number>()
    for (const { cell } of moved) {
      const to = cell.shift.to!
      byDestination.set(to, (byDestination.get(to) ?? 0) + 1)
    }
    const destinations = [...byDestination.entries()].sort((a, b) => b[1] - a[1])
    const direction =
      destinations.length === 1
        ? `, all of them to ${VERDICT_POSITION[destinations[0]![0]]}`
        : `: ${list(destinations.map(([verdict, count]) => `${count} to ${VERDICT_POSITION[verdict]}`))}`
    sentences.push(
      `${opening}, ${moved.length} of ${cells.length} models changed their answer${closing}${direction}.`,
    )
  }

  const comparable = rows.filter((row) =>
    row.cells.some((cell) => cell.shift.status !== 'incomparable'),
  )
  const held = comparable.filter((row) => !row.movedAnywhere)
  if (comparable.length > 0) {
    if (held.length === comparable.length) {
      sentences.push('Nobody budged under either framing.')
    } else if (held.length > 0) {
      sentences.push(`${list(held.map((row) => row.model.displayName))} did not budge.`)
    } else {
      sentences.push('Every model changed its answer at least once when told what to think.')
    }
  }

  return sentences.join(' ')
}
