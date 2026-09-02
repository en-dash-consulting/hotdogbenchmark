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
import type { BenchmarkRun, ModelResult, Verdict } from '../../schema/run.ts'
import { scoreModels } from './scores.ts'
import { questionShifts, treatedConditions } from './sensitivity.ts'

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
    return `No model returned a usable response during this reporting period. The classification of ${subject} remains undetermined pending restoration of provider availability.`
  }

  const consensus = consensusOf(results)
  const errored = results.filter((result) => result.status === 'error')
  const sentences: string[] = []

  if (consensus.unanimous && consensus.verdict) {
    sentences.push(
      `The field is unanimous: all ${consensus.total} evaluated models returned a ${VERDICT_NOUN[consensus.verdict]} classification for ${subject}.`,
    )
  } else if (consensus.verdict) {
    const dissenting = consensus.dissenters.map((result) => result.displayName)
    sentences.push(
      `A ${VERDICT_NOUN[consensus.verdict]} classification of ${subject} commands majority support this period, held by ${consensus.count} of ${consensus.total} evaluated models (${percent(consensus.share)}).`,
    )
    if (dissenting.length > 0) {
      sentences.push(
        `${list(dissenting)} ${dissenting.length === 1 ? 'departs' : 'depart'} from the majority position.`,
      )
    }
  } else {
    sentences.push(
      `The field remains divided on the classification of ${subject}, with no position commanding a plurality across the ${consensus.total} evaluated models.`,
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
      `${fastest.displayName} returned the fastest median response at ${latencyPhrase(fastest.aggregate.totalMs.median)}.`,
    )
  }
  if (compliance !== null && compliance < 1) {
    sentences.push(
      `Instruction compliance across the field stands at ${percent(compliance)}, indicating continued variance in adherence to the single-word response constraint.`,
    )
  }
  if (errored.length > 0) {
    sentences.push(
      `${list(errored.map((result) => result.displayName))} ${errored.length === 1 ? 'was' : 'were'} unavailable during data collection and ${errored.length === 1 ? 'is' : 'are'} excluded from the above.`,
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
        text: `No provider returned a usable response for ${subject} during this reporting period. No findings can be drawn.`,
      },
    ]
  }

  const findings: Finding[] = []
  const consensus = consensusOf(results)

  if (consensus.unanimous && consensus.verdict) {
    findings.push({
      label: 'Consensus',
      text: `The field is unanimous in its ${VERDICT_NOUN[consensus.verdict]} classification of ${subject}, a level of agreement rarely observed in this category.`,
    })
  } else if (consensus.verdict) {
    findings.push({
      label: 'Consensus',
      text: `A ${VERDICT_NOUN[consensus.verdict]} classification holds ${percent(consensus.share)} support (${consensus.count} of ${consensus.total} models).`,
    })
  } else {
    findings.push({
      label: 'No consensus',
      text: `The field is split, with no classification of ${subject} commanding a plurality. Buyers should not treat this category as settled.`,
    })
  }

  const dissent = consensus.dissenters
  if (dissent.length > 0 && consensus.verdict) {
    findings.push({
      label: 'Dissent',
      text: `${list(dissent.map((r) => r.displayName))} ${dissent.length === 1 ? 'maintains a' : 'maintain'} position${dissent.length === 1 ? '' : 's'} contrary to the majority.`,
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
      text: `${fastest.displayName} leads on median response time at ${latencyPhrase(fastest.aggregate.totalMs!.median)}; ${slowest.displayName} trails at ${latencyPhrase(slowest.aggregate.totalMs!.median)}, a ${multiple.toFixed(1)}× spread across the field.`,
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
        text: `${verbose.displayName} produced the most verbose output at a median of ${Math.round(verbose.aggregate.outputTokens!.median)} tokens, against a single-word instruction.`,
      })
    }
  }

  const nonCompliant = answering.filter(
    (result) => (result.aggregate.followedInstructionRate ?? 1) < 1,
  )
  if (nonCompliant.length > 0) {
    findings.push({
      label: 'Instruction compliance',
      text: `${list(nonCompliant.map((r) => r.displayName))} did not consistently observe the single-word constraint. Compliance is reported separately from classification throughout this report, as the two measure different capabilities.`,
    })
  } else {
    findings.push({
      label: 'Instruction compliance',
      text: 'All evaluated models observed the single-word response constraint without exception.',
    })
  }

  const errored = results.filter((result) => result.status === 'error')
  if (errored.length > 0) {
    findings.push({
      label: 'Provider availability',
      text: `${list(errored.map((r) => r.displayName))} returned no usable data this period. Availability is reported rather than suppressed; excluding unavailable providers would bias the longitudinal record.`,
    })
  }

  const scored = scoreModels(answering).sort((a, b) => b.composite - a.composite)
  const leader = scored[0]
  if (leader && scored.length >= 2) {
    findings.push({
      label: 'Composite standing',
      text: `${leader.result.displayName} holds the leading composite position at ${leader.composite.toFixed(2)}, on the blend of decisiveness and efficiency defined in the methodology.`,
    })
  }

  // Six is the ceiling: beyond that a findings list stops being a summary.
  return findings.slice(0, 6)
}

/** A one-line analyst verdict for a vendor scorecard. */
export function vendorVerdictLine(result: ModelResult, peers: ModelResult[]): string {
  if (result.status === 'error') {
    return 'Unavailable during data collection; no assessment can be offered for this period.'
  }

  const scored = scoreModels(peers).find(
    (entry) => entry.result.provider === result.provider && entry.result.modelId === result.modelId,
  )
  const decisive = (scored?.decisiveness ?? 0) >= 0.75
  const efficient = (scored?.efficiency ?? 0) >= 0.6

  if (decisive && efficient) {
    return 'Commits to a position and returns it promptly. Suitable for buyers prioritising both conviction and throughput.'
  }
  if (decisive) {
    return 'Commits to a clear position, though response times trail the field. Conviction over speed.'
  }
  if (efficient) {
    return 'Fast and economical, but declines to commit to a firm classification. Throughput over conviction.'
  }
  return 'Neither decisive nor notably efficient this period. Buyers should monitor subsequent editions before drawing conclusions.'
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
export function framingSummary(run: BenchmarkRun, questionId: string, subject: string): string {
  const rows = questionShifts(run, questionId)
  const arms = treatedConditions(run)
  if (arms.length === 0) return ''

  const sentences: string[] = []

  for (const arm of arms) {
    const cells = rows
      .map((row) => ({ row, cell: row.cells.find((c) => c.condition.id === arm.id)! }))
      .filter(({ cell }) => cell.shift.status !== 'incomparable')
    if (cells.length === 0) {
      sentences.push(
        `Under the ${arm.label.toLowerCase()} framing no model could be compared against its control position.`,
      )
      continue
    }
    const moved = cells.filter(({ cell }) => cell.shift.status === 'moved')
    if (moved.length === 0) {
      sentences.push(
        `Under the ${arm.label.toLowerCase()} framing, all ${cells.length} comparable models retained their control position on ${subject}.`,
      )
      continue
    }
    const described = moved.map(
      ({ row, cell }) =>
        `${row.model.displayName} (${VERDICT_POSITION[cell.shift.from!]} to ${VERDICT_POSITION[cell.shift.to!]})`,
    )
    sentences.push(
      `Under the ${arm.label.toLowerCase()} framing, ${moved.length} of ${cells.length} comparable models revised their classification of ${subject}: ${list(described)}.`,
    )
  }

  const comparable = rows.filter((row) =>
    row.cells.some((cell) => cell.shift.status !== 'incomparable'),
  )
  const held = comparable.filter((row) => !row.movedAnywhere)
  if (comparable.length > 0) {
    if (held.length === comparable.length) {
      sentences.push('No evaluated model changed its position under any framing.')
    } else if (held.length > 0) {
      sentences.push(
        `${list(held.map((row) => row.model.displayName))} ${held.length === 1 ? 'held its' : 'held their'} position under every framing.`,
      )
    } else {
      sentences.push('Every comparable model changed its position under at least one framing.')
    }
  }

  return sentences.join(' ')
}
