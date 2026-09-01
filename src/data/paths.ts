/**
 * Where run files live, and how their names are derived.
 *
 * The canonical location is `data/runs/<isoWeek>.json`, one file per edition.
 * Naming the file after the week rather than the timestamp is what makes a
 * re-run *correct* an edition instead of creating a second one — the weekly
 * job can be retried after a provider outage without polluting the archive.
 */

/** Directory holding run files, relative to the repository root. */
export const RUNS_DIR = 'data/runs'

/** The generated manifest the site reads, relative to the repository root. */
export const MANIFEST_PATH = 'data/index.json'

/**
 * The ISO 8601 week label for a date, in UTC — e.g. `2026-W36`.
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

/** Repository-relative path of the run file for a given week. */
export function runPathFor(isoWeek: string): string {
  return `${RUNS_DIR}/${isoWeek}.json`
}

/** The week label encoded in a run filename, or `null` if it is not one. */
export function isoWeekFromFilename(filename: string): string | null {
  const match = /^(\d{4}-W\d{2})\.json$/.exec(filename)
  return match?.[1] ?? null
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
