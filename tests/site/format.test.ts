import { describe, expect, it } from 'vitest'
import { formatEdition } from '../../src/site/lib/format.ts'

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
