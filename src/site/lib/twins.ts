/**
 * "Thinking alike": pairs of models that gave the same verdict on every
 * question they both answered.
 *
 * With three yes-or-no questions, most pairs agree on everything, and a line
 * that says so ("and 22 more pairs") tells the reader the statistic does not
 * discriminate. It is shown only when it does: when the registry has enough
 * questions for agreement to be unlikely by chance, or when the agreeing pairs
 * are a small share of all pairs.
 */
import type { Verdict } from '../../schema/run.ts'

export interface VerdictRow {
  name: string
  /** One verdict per question, in a shared order; null where the model did not answer. */
  verdicts: Array<Verdict | null>
}

/** Pairs that agree on at least two shared questions and disagree on none. */
export function twinPairs(rows: VerdictRow[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (let a = 0; a < rows.length; a += 1) {
    for (let b = a + 1; b < rows.length; b += 1) {
      const left = rows[a]!
      const right = rows[b]!
      let shared = 0
      let agree = true
      for (let i = 0; i < left.verdicts.length; i += 1) {
        const x = left.verdicts[i]
        const y = right.verdicts[i]
        if (!x || !y) continue
        shared += 1
        if (x !== y) {
          agree = false
          break
        }
      }
      if (agree && shared >= 2) pairs.push([left.name, right.name])
    }
  }
  return pairs
}

/** Below this many questions, agreement on all of them is too easy to be worth naming. */
export const TWINS_MIN_QUESTIONS = 5

/** Above this share of all pairs, the line names most of the field. */
export const TWINS_MAX_SHARE = 0.25

/**
 * Whether the thinking-alike line says something.
 *
 * True when fewer than a quarter of all possible pairs agree; with few
 * questions, only when the pairs can be named without an "and N more". Never
 * when nobody agrees, and never with fewer than two models.
 */
export function twinsWorthShowing(
  pairCount: number,
  modelCount: number,
  questionCount: number,
): boolean {
  if (pairCount === 0 || modelCount < 2) return false
  if (questionCount < TWINS_MIN_QUESTIONS && pairCount > 3) return false
  const possible = (modelCount * (modelCount - 1)) / 2
  return pairCount / possible < TWINS_MAX_SHARE
}
