/**
 * Request logging.
 *
 * **The log line is constructed from a fixed set of fields.** There is no code
 * path that logs a header, a body, a prompt or a key, because none of those is
 * ever passed to this function. That is a structural guarantee rather than a
 * redaction step that a future edit could forget to apply.
 *
 * A test asserts that a request carrying an obvious secret produces a log line
 * not containing it.
 */
export interface LogEntry {
  event: 'forward' | 'auth' | 'rate_limit' | 'reject'
  /** The IdP subject. An opaque identifier, not an email address. */
  userId: string
  provider?: string
  status: number
  durationMs: number
  reason?: string
}

export type Logger = (line: string) => void

export function logRequest(entry: LogEntry, log: Logger = console.log): void {
  const fields = [
    `event=${entry.event}`,
    `user=${entry.userId}`,
    entry.provider ? `provider=${entry.provider}` : null,
    `status=${entry.status}`,
    `ms=${Math.round(entry.durationMs)}`,
    entry.reason ? `reason=${entry.reason}` : null,
  ].filter(Boolean)

  log(fields.join(' '))
}
