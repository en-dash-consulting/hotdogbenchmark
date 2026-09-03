import { describe, expect, it } from 'vitest'
import { describeRunDates, formatEdition } from '../../src/site/lib/format.ts'

describe('formatEdition', () => {
  it('renders a week key as the week number and year', () => {
    expect(formatEdition('2026-W36')).toBe('Week 36, 2026')
    expect(formatEdition('2026-W02')).toBe('Week 2, 2026')
  })

  it('renders a date key as a long date in UTC', () => {
    // No timezone may shift the day: the key names a UTC date and the label
    // must say the same date wherever the site is built.
    expect(formatEdition('2026-09-02')).toBe('September 2, 2026')
    expect(formatEdition('2026-01-01')).toBe('January 1, 2026')
    expect(formatEdition('2025-12-31')).toBe('December 31, 2025')
  })

  it('passes anything else through unchanged', () => {
    expect(formatEdition('latest')).toBe('latest')
  })
})

describe('describeRunDates', () => {
  it('names one day once however many runs it saw', () => {
    const day = ['2026-09-02T10:00:00Z', '2026-09-02T14:00:00Z', '2026-09-02T18:00:00Z']
    expect(describeRunDates(day)).toBe('on September 2, 2026')
  })

  it('joins two days with the year once', () => {
    expect(describeRunDates(['2026-09-02T10:00:00Z', '2026-09-03T10:00:00Z'])).toBe(
      'on September 2 and September 3, 2026',
    )
  })

  it('lists three or more days as a series', () => {
    expect(
      describeRunDates(['2026-09-01T10:00:00Z', '2026-09-02T10:00:00Z', '2026-09-03T10:00:00Z']),
    ).toBe('on September 1, September 2, and September 3, 2026')
  })

  it('keeps every year when they differ', () => {
    expect(describeRunDates(['2025-12-31T10:00:00Z', '2026-01-01T10:00:00Z'])).toBe(
      'on December 31, 2025 and January 1, 2026',
    )
  })

  it('is empty for no runs', () => {
    expect(describeRunDates([])).toBe('')
  })
})
