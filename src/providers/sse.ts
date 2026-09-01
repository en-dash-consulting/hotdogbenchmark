/**
 * A minimal server-sent-events reader.
 *
 * Every streaming adapter here needs the same thing: turn a `Response` body
 * into a sequence of parsed `data:` payloads. That is about thirty lines, so it
 * lives here rather than pulling in a dependency, and rather than being written
 * slightly differently in six adapters.
 *
 * Deliberately *not* a full SSE implementation. It ignores `event:`, `id:` and
 * `retry:` lines, because every provider this project talks to puts the event
 * type inside the JSON payload as well, and none of them use reconnection.
 */

/**
 * Yield each `data:` payload from an SSE response body, as a string.
 *
 * Payloads are yielded in order. The sentinel `[DONE]` that OpenAI-style APIs
 * send is filtered out — it is a framing detail, not data.
 */
export async function* readSseData(response: Response): AsyncGenerator<string> {
  const body = response.body
  if (!body) {
    throw new Error('Response has no body to stream')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })

    // Events are separated by a blank line. A chunk boundary can fall anywhere,
    // so anything after the last separator stays in the buffer for next time.
    let separator = findSeparator(buffer)
    while (separator !== -1) {
      const rawEvent = buffer.slice(0, separator.index)
      buffer = buffer.slice(separator.index + separator.length)
      const data = dataOf(rawEvent)
      if (data !== null && data !== '[DONE]') yield data
      separator = findSeparator(buffer)
    }
  }

  // A stream that ended without a trailing blank line still has one event left.
  buffer += decoder.decode()
  const trailing = dataOf(buffer)
  if (trailing !== null && trailing !== '[DONE]') yield trailing
}

/** Yield each `data:` payload parsed as JSON, skipping anything unparseable. */
export async function* readSseJson<T = unknown>(response: Response): AsyncGenerator<T> {
  for await (const data of readSseData(response)) {
    let parsed: T
    try {
      parsed = JSON.parse(data) as T
    } catch {
      // A payload that is not JSON is not something any of these APIs sends on
      // the success path. Skipping beats aborting a nearly-complete response.
      continue
    }
    yield parsed
  }
}

interface Separator {
  index: number
  length: number
}

/** Find the next event separator, accepting both `\n\n` and `\r\n\r\n`. */
function findSeparator(buffer: string): Separator | -1 {
  const crlf = buffer.indexOf('\r\n\r\n')
  const lf = buffer.indexOf('\n\n')
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 }
  if (lf !== -1) return { index: lf, length: 2 }
  return -1
}

/**
 * Extract the `data:` value from one raw event.
 *
 * Multiple `data:` lines in a single event are joined with newlines, which is
 * what the SSE specification says to do.
 */
function dataOf(rawEvent: string): string | null {
  const parts: string[] = []
  for (const line of rawEvent.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue
    // Exactly one optional leading space is part of the framing, per the spec.
    parts.push(line.slice(5).replace(/^ /, ''))
  }
  return parts.length > 0 ? parts.join('\n') : null
}
