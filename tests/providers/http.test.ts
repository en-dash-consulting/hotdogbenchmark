import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RETRY_POLICY,
  backoffDelay,
  fetchWithPolicy,
  isRetryableStatus,
  parseRetryAfter,
  safeUrl,
  summarizeErrorBody,
  type RetryInfo,
} from '../../src/providers/http.ts'
import { ProviderError } from '../../src/providers/types.ts'

const URL_UNDER_TEST = 'https://api.example.com/v1/messages?key=super-secret'

/** A fetch stub that returns a scripted sequence of responses or throws. */
function scriptedFetch(steps: Array<Response | Error | (() => Promise<never>)>) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  let index = 0
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const step = steps[Math.min(index, steps.length - 1)]
    index += 1
    if (typeof step === 'function') return step()
    if (step instanceof Error) throw step
    return step!.clone()
  }) as unknown as typeof globalThis.fetch
  // A getter here would be evaluated once by Object.assign and frozen; the
  // count has to be read from the array itself.
  return Object.assign(fn, { calls })
}

const ok = (body = '{"ok":true}') => new Response(body, { status: 200 })
const status = (code: number, body = '', headers: Record<string, string> = {}) =>
  new Response(body, { status: code, headers })

/** No real waiting: retries resolve instantly and record what they were told to wait. */
function instantPolicy(recorded: number[] = []) {
  return {
    sleep: async (ms: number) => {
      recorded.push(ms)
    },
    random: () => 0.5, // center of the jitter band, so delays are deterministic
    recorded,
  }
}

afterEach(() => vi.useRealTimers())

describe('safeUrl', () => {
  it('drops the query string, because some vendors accept a key there', () => {
    expect(safeUrl(URL_UNDER_TEST)).toBe('https://api.example.com/v1/messages')
  })

  it('does not throw on a malformed URL', () => {
    expect(safeUrl('not a url')).toBe('(unparseable url)')
  })
})

describe('parseRetryAfter', () => {
  it('reads a delay in seconds', () => {
    expect(parseRetryAfter('30')).toBe(30_000)
  })

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('2026-09-01T12:00:00Z')
    expect(parseRetryAfter('Tue, 01 Sep 2026 12:00:20 GMT', now)).toBe(20_000)
  })

  it('never returns a negative delay for a date in the past', () => {
    const now = Date.parse('2026-09-01T12:00:00Z')
    expect(parseRetryAfter('Tue, 01 Sep 2026 11:00:00 GMT', now)).toBe(0)
  })

  it('returns null for a missing or unparseable value, so backoff is used instead', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })
})

describe('backoffDelay', () => {
  const policy = { ...DEFAULT_RETRY_POLICY }

  it('doubles with each attempt', () => {
    const center = () => 0.5
    expect(backoffDelay(1, policy, center)).toBe(500)
    expect(backoffDelay(2, policy, center)).toBe(1000)
    expect(backoffDelay(3, policy, center)).toBe(2000)
  })

  it('applies jitter symmetrically around the computed delay', () => {
    expect(backoffDelay(1, policy, () => 0)).toBe(375) // -25%
    expect(backoffDelay(1, policy, () => 1)).toBe(625) // +25%
  })

  it('clamps to maxDelayMs so growth cannot outlast the weekly job', () => {
    expect(backoffDelay(20, policy, () => 0.5)).toBe(policy.maxDelayMs)
  })
})

describe('isRetryableStatus', () => {
  it.each([
    [429, true],
    [500, true],
    [503, true],
    [400, false],
    [401, false],
    [403, false],
    [404, false],
  ])('%i → %s', (code, expected) => {
    expect(isRetryableStatus(code)).toBe(expected)
  })
})

describe('fetchWithPolicy on success', () => {
  it('returns the response and makes exactly one call', async () => {
    const fetch = scriptedFetch([ok()])
    const response = await fetchWithPolicy(URL_UNDER_TEST, {}, { fetch })
    expect(response.status).toBe(200)
    expect(fetch.calls.length).toBe(1)
  })

  it('passes the method, headers and body through untouched', async () => {
    const fetch = scriptedFetch([ok()])
    await fetchWithPolicy(
      URL_UNDER_TEST,
      { method: 'POST', headers: { 'x-api-key': 'secret' }, body: '{"a":1}' },
      { fetch },
    )
    expect(fetch.calls[0]?.init.method).toBe('POST')
    expect(fetch.calls[0]?.init.body).toBe('{"a":1}')
  })
})

describe('fetchWithPolicy retry behavior', () => {
  it('retries a 429 with growing delays and then succeeds', async () => {
    const { sleep, random, recorded } = instantPolicy()
    const fetch = scriptedFetch([status(429), status(429), ok()])
    const response = await fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { sleep, random })
    expect(response.status).toBe(200)
    expect(fetch.calls.length).toBe(3)
    expect(recorded).toEqual([500, 1000])
  })

  it('retries a 503', async () => {
    const { sleep, random } = instantPolicy()
    const fetch = scriptedFetch([status(503), ok()])
    await expect(
      fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { sleep, random }),
    ).resolves.toBeDefined()
    expect(fetch.calls.length).toBe(2)
  })

  it('honors Retry-After in preference to computed backoff', async () => {
    const { sleep, random, recorded } = instantPolicy()
    const fetch = scriptedFetch([status(429, '', { 'retry-after': '7' }), ok()])
    await fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { sleep, random })
    expect(recorded).toEqual([7000])
  })

  it('gives up after maxRetries and throws the last error', async () => {
    const { sleep, random } = instantPolicy()
    const fetch = scriptedFetch([status(429)])
    await expect(
      fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { sleep, random, maxRetries: 2 }),
    ).rejects.toMatchObject({ category: 'rate_limit', providerStatus: 429 })
    expect(fetch.calls.length).toBe(3) // the first attempt plus two retries
  })

  it('respects a maxRetries of 0', async () => {
    const fetch = scriptedFetch([status(503)])
    await expect(
      fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { maxRetries: 0 }),
    ).rejects.toBeInstanceOf(ProviderError)
    expect(fetch.calls.length).toBe(1)
  })

  it('retries a transport-level throw, which is often transient', async () => {
    const { sleep, random } = instantPolicy()
    const fetch = scriptedFetch([new TypeError('fetch failed'), ok()])
    await expect(
      fetchWithPolicy(URL_UNDER_TEST, {}, { fetch }, { sleep, random }),
    ).resolves.toBeDefined()
    expect(fetch.calls.length).toBe(2)
  })
})

describe('fetchWithPolicy never retries client errors', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [400, 'bad_response'],
  ])('%i maps to %s and is attempted once', async (code, category) => {
    const fetch = scriptedFetch([status(code, JSON.stringify({ error: { message: 'nope' } }))])
    await expect(fetchWithPolicy(URL_UNDER_TEST, {}, { fetch })).rejects.toMatchObject({
      category,
      retryable: false,
      providerStatus: code,
    })
    expect(fetch.calls.length).toBe(1)
  })
})

describe('fetchWithPolicy timeout', () => {
  it('aborts the underlying fetch and reports category timeout', async () => {
    vi.useFakeTimers()

    // A fetch that never resolves on its own, and rejects only when aborted —
    // exactly how a hung connection behaves.
    let sawAbort = false
    const fetch = (async (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          sawAbort = true
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })) as unknown as typeof globalThis.fetch

    const promise = fetchWithPolicy(
      URL_UNDER_TEST,
      {},
      { fetch },
      { timeoutMs: 60_000, maxRetries: 0 },
    )
    const assertion = expect(promise).rejects.toMatchObject({
      category: 'timeout',
      retryable: true,
    })

    await vi.advanceTimersByTimeAsync(60_000)
    await assertion
    expect(sawAbort, 'the underlying fetch must actually be aborted').toBe(true)
  })

  it('stops immediately when the caller has already given up', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = scriptedFetch([ok()])
    await expect(
      fetchWithPolicy(URL_UNDER_TEST, {}, { fetch, signal: controller.signal }),
    ).rejects.toMatchObject({ category: 'timeout' })
    expect(fetch.calls.length).toBe(0)
  })
})

describe('retry logging', () => {
  it('receives no headers or body at all, so there is nothing to leak', async () => {
    const { sleep, random } = instantPolicy()
    const seen: RetryInfo[] = []
    const fetch = scriptedFetch([status(429), ok()])

    await fetchWithPolicy(
      URL_UNDER_TEST,
      {
        method: 'POST',
        headers: { authorization: 'Bearer sk-leak-me', 'x-api-key': 'sk-also-leak-me' },
        body: '{"prompt":"secret"}',
      },
      { fetch },
      { sleep, random, onRetry: (info) => seen.push(info) },
    )

    expect(seen).toHaveLength(1)
    const serialized = JSON.stringify(seen)
    expect(serialized).not.toContain('sk-leak-me')
    expect(serialized).not.toContain('sk-also-leak-me')
    expect(serialized).not.toContain('authorization')
    expect(serialized).not.toContain('super-secret') // the key in the query string
    expect(seen[0]?.url).toBe('https://api.example.com/v1/messages')
    expect(seen[0]).toMatchObject({ attempt: 1, remaining: 2, status: 429 })
  })

  it('does not include the query string in a thrown error message either', async () => {
    const fetch = scriptedFetch([status(401, 'bad key')])
    await expect(fetchWithPolicy(URL_UNDER_TEST, {}, { fetch })).rejects.toThrow(
      /https:\/\/api\.example\.com\/v1\/messages/,
    )
    await expect(fetchWithPolicy(URL_UNDER_TEST, {}, { fetch })).rejects.not.toThrow(/super-secret/)
  })
})

describe('summarizeErrorBody', () => {
  it('pulls the message out of the shape most vendors use', () => {
    expect(summarizeErrorBody('{"error":{"message":"model not found"}}')).toBe('model not found')
  })

  it('handles a flat message field', () => {
    expect(summarizeErrorBody('{"message":"rate limited"}')).toBe('rate limited')
  })

  it('handles error as a plain string', () => {
    expect(summarizeErrorBody('{"error":"overloaded"}')).toBe('overloaded')
  })

  it('falls back to raw text when the body is not JSON', () => {
    expect(summarizeErrorBody('  <html>502 Bad Gateway</html>  ')).toBe(
      '<html>502 Bad Gateway</html>',
    )
  })

  it('collapses whitespace and truncates, since this text is rendered publicly', () => {
    const long = 'x'.repeat(500)
    const summary = summarizeErrorBody(long)
    expect(summary).toHaveLength(300)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('returns an empty string for an empty body', () => {
    expect(summarizeErrorBody('   ')).toBe('')
  })
})
