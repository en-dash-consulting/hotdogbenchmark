/**
 * Helpers for driving an adapter against a recorded wire fixture.
 *
 * Adapter tests never touch the network. They hand the adapter a `fetch` that
 * returns a fixture, then assert on what came out the other side.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AdapterContext } from '../../src/providers/types.ts'

const WIRE_DIR = fileURLToPath(new URL('../fixtures/wire/', import.meta.url))

/** Read a recorded wire fixture, e.g. `anthropic/success.sse`. */
export function wireFixture(relativePath: string): string {
  return readFileSync(WIRE_DIR + relativePath, 'utf8')
}

/** A 200 response streaming the given SSE text, chunked to exercise the parser. */
export function sseResponse(body: string, chunkSize = 24): Response {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(body)
  let offset = 0

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      // Deliberately small chunks: event boundaries land mid-chunk, which is
      // exactly the case a naive SSE parser gets wrong.
      controller.enqueue(bytes.slice(offset, offset + chunkSize))
      offset += chunkSize
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

/** A non-200 JSON response. */
export function errorResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } })
}

/** A `fetch` returning one scripted response, recording what it was called with. */
export function fetchReturning(response: Response | (() => Response)) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return typeof response === 'function' ? response() : response
  }) as unknown as typeof globalThis.fetch
  return Object.assign(fn, { calls })
}

/** Parse the JSON body an adapter sent, for asserting on request construction. */
export function sentBody(calls: Array<{ init: RequestInit }>, index = 0): Record<string, unknown> {
  return JSON.parse(String(calls[index]?.init.body ?? '{}')) as Record<string, unknown>
}

/** The headers an adapter sent, lowercased. */
export function sentHeaders(
  calls: Array<{ init: RequestInit }>,
  index = 0,
): Record<string, string> {
  const raw = (calls[index]?.init.headers ?? {}) as Record<string, string>
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]))
}

/** An `AdapterContext` wired to a given fetch. Retries are instant. */
export function wireContext(
  fetch: typeof globalThis.fetch,
  overrides: Partial<AdapterContext> = {},
): AdapterContext {
  return {
    credentials: { apiKey: 'test-key-do-not-log' },
    fetch,
    signal: new AbortController().signal,
    ...overrides,
  }
}

/** Retry policy for tests: no waiting, no randomness. */
export const INSTANT_RETRIES = {
  sleep: async () => {},
  random: () => 0.5,
  maxRetries: 1,
}
