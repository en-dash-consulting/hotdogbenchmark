/**
 * When the next edition lands, from the latest one and the schedule.
 *
 * A weekly publication should say when it publishes next; the cheapest
 * retention loop there is. The date is the first scheduled slot after the
 * latest edition finished. When the build happens well after that slot and
 * no newer edition exists, the line says the edition is late rather than
 * predicting a date that has passed: that honesty is in the project's voice.
 */
import type { SiteRegistry } from '../../schema/site.ts'

export interface NextEdition {
  /** The scheduled slot, in UTC. */
  date: Date
  /** True when the slot has passed by more than the grace period with no edition. */
  late: boolean
}

/** How long after the slot an edition may still be on its way: a day of retries and redeploys. */
const GRACE_MS = 24 * 60 * 60 * 1000

/** The first scheduled slot strictly after `after`. */
export function nextSlot(after: Date, schedule: SiteRegistry['schedule']): Date {
  const slot = new Date(
    Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), schedule.hourUtc),
  )
  const ahead = (schedule.weekday - slot.getUTCDay() + 7) % 7
  slot.setUTCDate(slot.getUTCDate() + ahead)
  if (slot.getTime() <= after.getTime()) slot.setUTCDate(slot.getUTCDate() + 7)
  return slot
}

/**
 * The next edition after the latest one, judged at `now`. Null with no
 * edition yet: there is nothing to count from.
 */
export function nextEdition(
  latestFinishedAt: string | null,
  schedule: SiteRegistry['schedule'],
  now: Date,
): NextEdition | null {
  if (!latestFinishedAt) return null
  const finished = new Date(latestFinishedAt)
  if (Number.isNaN(finished.getTime())) return null
  const date = nextSlot(finished, schedule)
  return { date, late: now.getTime() > date.getTime() + GRACE_MS }
}

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
const LONG = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "Monday, September 8". */
export function formatSlot(date: Date): string {
  return LONG.format(date)
}

/** The sentence for the footer: what is coming, or what is overdue. */
export function nextEditionLine(next: NextEdition | null): string {
  if (!next) return ''
  if (next.late) return `The next edition was due ${formatSlot(next.date)} and is running late.`
  return `Next edition: ${formatSlot(next.date)} (${WEEKDAY.format(next.date)}s, weekly).`.replace(
    ` (${WEEKDAY.format(next.date)}s, weekly)`,
    '',
  )
}
