/**
 * Turning what a model said into something countable.
 *
 * This is the most contestable code in the project, so it is also the most
 * explicit. The synonym lists below are exported and rendered verbatim on the
 * methodology page, so a reader who disagrees with a classification can see
 * exactly which rule produced it rather than taking the chart on faith.
 *
 * Two things are measured, and they are independent:
 *
 *   **verdict** — did the model say yes, no, or something else.
 *   **followedInstruction** — did it answer in one word, as asked.
 *
 * A model can be decisive and disobedient ("Absolutely not, because…"), or
 * obedient and evasive ("Depends."). Collapsing those into one score would hide
 * the more interesting half of the result.
 *
 * The verbatim text is always kept alongside. Nothing here edits what a model
 * said; it only categorizes it.
 */

/**
 * Answers counted as "yes".
 *
 * Deliberately short. Every addition is a judgement call that moves numbers on
 * a published chart, so the bar is "a reasonable person would call this a yes
 * with no further context".
 */
export const YES_WORDS: readonly string[] = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'absolutely',
  'definitely',
  'certainly',
  'indeed',
  'affirmative',
  'correct',
  'true',
]

/** Answers counted as "no". Held to the same bar as {@link YES_WORDS}. */
export const NO_WORDS: readonly string[] = [
  'no',
  'nope',
  'nah',
  'never',
  'negative',
  'incorrect',
  'false',
]

/**
 * Words that make an answer a hedge no matter what else is in it.
 *
 * Not used to classify — anything that is not exactly a yes-word or a no-word
 * is already `other`. These exist so the methodology page can show the reader
 * what "hedging" concretely looks like in the collected answers.
 */
export const HEDGE_WORDS: readonly string[] = [
  'technically',
  'arguably',
  'depends',
  'sometimes',
  'debatable',
  'contextually',
  'perhaps',
  'maybe',
  'sort',
  'kind',
]

export type Verdict = 'yes' | 'no' | 'other'

export interface AnswerAnalysis {
  verdict: Verdict
  /** True when the normalized answer is exactly one word. */
  followedInstruction: boolean
  /** The normalized form the verdict was decided from. Never shown as the answer. */
  normalized: string
  /** Words in the normalized answer. Zero for an empty response. */
  wordCount: number
}

/**
 * Reduce an answer to a comparable form.
 *
 * Strips surrounding quotes and markdown emphasis, drops trailing punctuation,
 * collapses whitespace (including newlines), and lowercases. Everything here is
 * about presentation rather than meaning: `"**Yes.**"` and `yes` are the same
 * answer, and a benchmark that counted them differently would be measuring
 * formatting.
 */
export function normalizeAnswer(text: string): string {
  return (
    text
      .normalize('NFKC')
      .trim()
      // Markdown emphasis a model added to a one-word answer.
      .replace(/[*_`]+/g, '')
      // Surrounding quotes, including the curly ones models like.
      .replace(/^["'‘’“”]+|["'‘’“”]+$/g, '')
      // Trailing sentence punctuation.
      .replace(/[.!?,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  )
}

/**
 * Classify one answer.
 *
 * Never throws. It is handed arbitrary text from seven different models, which
 * over enough weeks will include emoji, non-Latin scripts, empty strings, and
 * whatever else. A crash here would lose a whole run's worth of data over one
 * strange response.
 */
export function analyzeAnswer(text: string): AnswerAnalysis {
  const normalized = normalizeAnswer(typeof text === 'string' ? text : '')
  const words = normalized === '' ? [] : normalized.split(' ')

  return {
    // A one-word answer is classified on that word; anything longer is `other`,
    // including "yes, but" and "no because". The question asked for one word,
    // and a model that wrote a paragraph has told us something different from
    // a model that wrote "Yes" — which is what followedInstruction records.
    verdict: verdictFor(words),
    followedInstruction: words.length === 1,
    normalized,
    wordCount: words.length,
  }
}

function verdictFor(words: string[]): Verdict {
  const [only] = words
  if (words.length !== 1 || only === undefined) return 'other'
  if (YES_WORDS.includes(only)) return 'yes'
  if (NO_WORDS.includes(only)) return 'no'
  return 'other'
}

/** Whether a normalized answer contains a recognised hedge. For the methodology page. */
export function containsHedge(normalized: string): boolean {
  const words = normalized.split(' ')
  return words.some((word) => HEDGE_WORDS.includes(word))
}
