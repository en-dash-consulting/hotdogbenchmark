import { describe, expect, it } from 'vitest'
import { nextEdition, nextEditionLine, nextSlot } from '../../src/site/lib/next-edition.ts'

const MONDAY_NOON = { weekday: 1, hourUtc: 12 }

describe('nextSlot', () => {
  it('finds the following Monday noon after a Wednesday run', () => {
    // 2026-09-02 is a Wednesday.
    const slot = nextSlot(new Date('2026-09-02T20:00:00Z'), MONDAY_NOON)
    expect(slot.toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })

  it('skips a Monday slot that has already passed on the same day', () => {
    const slot = nextSlot(new Date('2026-09-07T12:30:00Z'), MONDAY_NOON)
    expect(slot.toISOString()).toBe('2026-09-14T12:00:00.000Z')
  })

  it('keeps a Monday slot still ahead on the same day', () => {
    const slot = nextSlot(new Date('2026-09-07T09:00:00Z'), MONDAY_NOON)
    expect(slot.toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })
})

describe('nextEdition', () => {
  it('is on time when judged before the slot', () => {
    const next = nextEdition('2026-09-02T20:00:00Z', MONDAY_NOON, new Date('2026-09-05T00:00:00Z'))
    expect(next?.late).toBe(false)
    expect(nextEditionLine(next)).toBe('Next edition: Monday, September 7.')
  })

  it('says late once the slot and a day of grace have passed with no edition', () => {
    const next = nextEdition('2026-09-02T20:00:00Z', MONDAY_NOON, new Date('2026-09-09T00:00:00Z'))
    expect(next?.late).toBe(true)
    expect(nextEditionLine(next)).toMatch(/was due Monday, September 7 and is running late/)
  })

  it('is null with no edition to count from', () => {
    expect(nextEdition(null, MONDAY_NOON, new Date())).toBeNull()
    expect(nextEditionLine(null)).toBe('')
  })
})
