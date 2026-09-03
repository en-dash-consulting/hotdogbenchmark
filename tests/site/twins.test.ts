import { describe, expect, it } from 'vitest'
import { twinPairs, twinsWorthShowing } from '../../src/site/lib/twins.ts'

describe('twinPairs', () => {
  it('pairs models that agree on every shared question', () => {
    const pairs = twinPairs([
      { name: 'A', verdicts: ['yes', 'no', 'no'] },
      { name: 'B', verdicts: ['yes', 'no', 'no'] },
      { name: 'C', verdicts: ['no', 'no', 'no'] },
    ])
    expect(pairs).toEqual([['A', 'B']])
  })

  it('needs at least two shared answers, and ignores gaps', () => {
    const pairs = twinPairs([
      { name: 'A', verdicts: ['yes', null, 'no'] },
      { name: 'B', verdicts: ['yes', 'no', null] },
      { name: 'C', verdicts: ['yes', null, 'no'] },
    ])
    expect(pairs).toEqual([['A', 'C']])
  })
})

describe('twinsWorthShowing', () => {
  it('hides the line when most of the field agrees on a few questions', () => {
    // Three questions, eleven models, 25 of 55 pairs agree: the Week 36 case.
    expect(twinsWorthShowing(25, 11, 3)).toBe(false)
  })

  it('shows the line when the agreeing pairs are rare', () => {
    expect(twinsWorthShowing(3, 11, 3)).toBe(true)
  })

  it('keeps hiding it while most of the field agrees, however many questions', () => {
    expect(twinsWorthShowing(25, 11, 5)).toBe(false)
    expect(twinsWorthShowing(20, 12, 6)).toBe(false)
    expect(twinsWorthShowing(10, 12, 6)).toBe(true)
  })

  it('never shows an empty line', () => {
    expect(twinsWorthShowing(0, 11, 9)).toBe(false)
    expect(twinsWorthShowing(1, 1, 9)).toBe(false)
  })
})
