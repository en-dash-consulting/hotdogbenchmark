/**
 * Number and date formatting for the report.
 *
 * All of it goes through `Intl`, and all metrics render with tabular numerals
 * (set in the stylesheet) so columns of figures line up. A report where the
 * digits jitter between rows reads as amateur no matter what the numbers say.
 *
 * Every formatter here takes `null` and returns an em dash. Null is common in
 * this data and always means "not reported" rather than zero, so the display
 * has to make that visible rather than printing a misleading 0.
 */

/** What a missing value looks like. Not "0", not blank. */
export const NOT_REPORTED = '—'

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })

/** A whole number with thousands separators. */
export function formatInteger(value: number | null | undefined): string {
  return value == null ? NOT_REPORTED : integer.format(value)
}

/** Milliseconds, shown as ms below a second and seconds above it. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return NOT_REPORTED
  if (ms < 1000) return `${integer.format(ms)} ms`
  return `${oneDecimal.format(ms / 1000)} s`
}

/** Tokens per second. */
export function formatRate(value: number | null | undefined): string {
  return value == null ? NOT_REPORTED : `${oneDecimal.format(value)} tok/s`
}

/** A 0..1 fraction as a percentage. */
export function formatPercent(value: number | null | undefined): string {
  return value == null ? NOT_REPORTED : percent.format(value)
}

/**
 * A USD estimate.
 *
 * These are fractions of a cent, so a plain currency format would render nearly
 * every value as "$0.00" and the column would carry no information.
 */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return NOT_REPORTED
  if (value === 0) return '$0'
  if (value < 0.01) return `$${value.toFixed(6)}`
  return `$${value.toFixed(4)}`
}

/**
 * An edition key as a label: `2026-W36` → `Week 36, 2026`, and a daily
 * edition's `2026-09-02` → `September 2, 2026`. Anything else is returned as
 * it came, so an unexpected key shows up on the page rather than vanishing.
 */
export function formatEdition(editionKey: string): string {
  const week = /^(\d{4})-W(\d{2})$/.exec(editionKey)
  if (week) return `Week ${Number(week[2])}, ${week[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(editionKey)) return formatDate(`${editionKey}T00:00:00Z`)
  return editionKey
}

/** An ISO timestamp as a readable date in UTC. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** A short date for dense contexts like chart axes. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** The document reference number printed on a report masthead. */
export function documentReference(runId: string, questionId: string): string {
  const short = runId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const suffix = questionId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
  return `SCB-${suffix}-${short}`
}
