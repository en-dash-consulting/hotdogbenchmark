/**
 * Where run files live, and how their names are derived.
 *
 * The canonical location is `data/runs/<editionKey>.json`, one file per
 * edition. Naming the file after the edition rather than the timestamp is what
 * makes a re-run *correct* an edition instead of creating a second one: the
 * scheduled job can be retried after a provider outage without polluting the
 * archive.
 *
 * An edition key comes in two shapes, chosen by the run's cadence:
 *
 *   - weekly, the default: an ISO week in UTC, `2026-W36`
 *   - daily, for forks that want a denser record: a UTC date, `2026-09-02`
 *
 * Both kinds can live in the same directory, and the ordering helpers here
 * interleave them chronologically so the archive reads as one timeline.
 */

/** Directory holding run files, relative to the repository root. */
export const RUNS_DIR = 'data/runs'

/** The generated manifest the site reads, relative to the repository root. */
export const MANIFEST_PATH = 'data/index.json'

/** How often an edition is cut: one file per ISO week, or one per UTC day. */
export type Cadence = 'week' | 'day'

/** Every cadence the runner accepts, in the order the help text lists them. */
export const CADENCES: readonly Cadence[] = ['week', 'day']

/** The cadence used when neither the flag nor the environment names one. */
export const DEFAULT_CADENCE: Cadence = 'week'

/** Whether a string is one of the accepted cadences. */
export function isCadence(value: string): value is Cadence {
  return (CADENCES as readonly string[]).includes(value)
}

const WEEK_KEY = /^(\d{4})-W(\d{2})$/
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The ISO 8601 week label for a date, in UTC, e.g. `2026-W36`.
 *
 * ISO weeks start on Monday, and week 1 is the week containing the year's first
 * Thursday. That definition is why the answer is not simply "week of the year":
 * the first days of January can belong to the previous year's week 52 or 53,
 * and the last days of December can belong to the next year's week 1.
 *
 * Always computed in UTC. A run started at 23:00 on a Sunday in one timezone
 * and 01:00 on Monday in another must land in exactly one edition, and UTC is
 * the only tiebreak that does not depend on where the runner happens to be.
 */
export function isoWeekFor(date: Date): string {
  // Work with the date only; the time of day never changes which week it is.
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

  // Shift to the Thursday of this week. The ISO year is whichever calendar year
  // that Thursday falls in, which is the whole trick.
  const dayOfWeek = target.getUTCDay() || 7 // Sunday is 0 in JS, 7 in ISO
  target.setUTCDate(target.getUTCDate() + 4 - dayOfWeek)

  const isoYear = target.getUTCFullYear()
  const firstDayOfIsoYear = Date.UTC(isoYear, 0, 1)
  const daysSince = (target.getTime() - firstDayOfIsoYear) / 86_400_000
  const week = Math.ceil((daysSince + 1) / 7)

  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

/** The UTC calendar date of an instant, e.g. `2026-09-02`. */
export function utcDateFor(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * The edition key an instant belongs to under a cadence.
 *
 * Both kinds are computed in UTC for the same reason `isoWeekFor` is: a run
 * must land in exactly one edition no matter where the runner sits.
 */
export function editionKeyFor(date: Date, cadence: Cadence): string {
  return cadence === 'day' ? utcDateFor(date) : isoWeekFor(date)
}

/** Repository-relative path of the run file for a given week. */
export function runPathFor(isoWeek: string): string {
  return runPathForKey(isoWeek)
}

/** Repository-relative path of the run file for an edition key of either kind. */
export function runPathForKey(editionKey: string): string {
  return `${RUNS_DIR}/${editionKey}.json`
}

/** The week label encoded in a weekly run filename, or `null` if it is not one. */
export function isoWeekFromFilename(filename: string): string | null {
  const key = editionKeyFromFilename(filename)
  return key !== null && editionKind(key) === 'week' ? key : null
}

/**
 * The edition key encoded in a run filename of either kind, or `null` if the
 * file is not a run file. Only the two exact shapes count: `README.md`, a
 * `.bak` copy, or anything under `superseded/` is not an edition.
 */
export function editionKeyFromFilename(filename: string): string | null {
  const match = /^(\d{4}-(?:W\d{2}|\d{2}-\d{2}))\.json$/.exec(filename)
  return match?.[1] ?? null
}

/** Which kind of edition a key names, or `null` for a string that is neither. */
export function editionKind(editionKey: string): Cadence | null {
  if (WEEK_KEY.test(editionKey)) return 'week'
  if (DAY_KEY.test(editionKey)) return 'day'
  return null
}

/**
 * The first UTC instant an edition covers, in epoch milliseconds: Monday
 * 00:00 for a week, midnight for a day. This is what lets the two kinds be
 * ordered on one axis.
 *
 * Throws on a string that is not an edition key. Every caller gets its keys
 * from a filename parser or a validated run, so reaching this is a bug rather
 * than bad data, and a silent NaN would only move the failure somewhere
 * harder to trace.
 */
export function editionStart(editionKey: string): number {
  const week = WEEK_KEY.exec(editionKey)
  if (week) {
    const year = Number(week[1])
    const number = Number(week[2])
    // January 4th is always in ISO week 1, so week 1's Monday is that date
    // stepped back to the nearest Monday.
    const january4 = new Date(Date.UTC(year, 0, 4))
    const offsetToMonday = (january4.getUTCDay() || 7) - 1
    const monday = Date.UTC(year, 0, 4 - offsetToMonday)
    return monday + (number - 1) * 7 * 86_400_000
  }
  const day = DAY_KEY.exec(editionKey)
  if (day) {
    return Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
  }
  throw new Error(`"${editionKey}" is not an edition key (expected 2026-W36 or 2026-09-02)`)
}

/**
 * Sort key that puts the newest edition first.
 *
 * Week labels sort correctly as plain strings because the year comes first and
 * the week is zero-padded, which is the entire reason for that format.
 */
export function newestFirst(a: { isoWeek: string }, b: { isoWeek: string }): number {
  return b.isoWeek.localeCompare(a.isoWeek)
}

/**
 * Sort key that puts the newest edition first across both kinds of key.
 *
 * Compared by the first instant each edition covers, so a daily edition falls
 * among the weeks around it rather than sorting as a separate block. When a
 * day and a week start at the same instant (a Monday), the week comes first:
 * it is the broader edition, and a reader scanning the list expects the
 * summary ahead of the detail.
 */
export function newestEditionFirst(a: { editionKey: string }, b: { editionKey: string }): number {
  const byStart = editionStart(b.editionKey) - editionStart(a.editionKey)
  if (byStart !== 0) return byStart
  return kindRank(a.editionKey) - kindRank(b.editionKey)
}

function kindRank(editionKey: string): number {
  return editionKind(editionKey) === 'day' ? 1 : 0
}
