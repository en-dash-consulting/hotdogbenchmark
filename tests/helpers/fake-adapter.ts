/**
 * An in-memory adapter used across the test suite.
 *
 * Its existence is also an assertion: if `ProviderAdapter` needed anything more
 * than one `complete()` method, this file could not implement the interface
 * without modification. It does, so the interface is sufficient.
 */
import type {
  AdapterContext,
  CompleteRequest,
  CompleteResult,
  ProviderAdapter,
} from '../../src/providers/types.ts'
import { ProviderError } from '../../src/providers/types.ts'

export interface FakeAdapterOptions {
  id?: string
  /** What the model "says". A function receives the prompt, so it can vary by question. */
  answer?: string | ((request: CompleteRequest) => string)
  /** Throw this instead of answering. */
  failWith?: ProviderError
  /** Simulated wall-clock duration recorded in `timing.totalMs`. */
  totalMs?: number
  /** Simulated time to first token, or null for a non-streaming provider. */
  ttfbMs?: number | null
  /** Resolve only after this many real milliseconds, for concurrency tests. */
  delayMs?: number
}

export interface FakeAdapter extends ProviderAdapter {
  /** Every request this adapter received, in order. */
  readonly calls: CompleteRequest[]
  /** How many calls are in flight right now. */
  readonly inFlight: number
  /** The highest `inFlight` ever reached — the actual observed concurrency. */
  readonly maxInFlight: number
}

/** Build an adapter that answers from memory instead of calling anything. */
export function makeFakeAdapter(options: FakeAdapterOptions = {}): FakeAdapter {
  const { id = 'fake', answer = 'No', failWith, totalMs = 100, ttfbMs = 40, delayMs = 0 } = options

  const calls: CompleteRequest[] = []
  let inFlight = 0
  let maxInFlight = 0

  const adapter = {
    id,
    displayName: `Fake (${id})`,
    calls,
    get inFlight() {
      return inFlight
    },
    get maxInFlight() {
      return maxInFlight
    },
    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      calls.push(request)
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      try {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
        if (context.signal.aborted) {
          throw new ProviderError('timeout', 'Request timed out')
        }
        if (failWith) throw failWith

        context.onFirstToken?.()
        const text = typeof answer === 'function' ? answer(request) : answer
        const outputTokens = Math.max(1, text.trim().split(/\s+/).length)
        const inputTokens = Math.max(1, request.prompt.trim().split(/\s+/).length)

        return {
          text,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            reasoningTokens: null,
            cachedInputTokens: null,
          },
          timing: {
            startedAt: new Date(0).toISOString(),
            ttfbMs,
            totalMs,
          },
          raw: { fake: true },
        }
      } finally {
        inFlight -= 1
      }
    },
  }

  return adapter satisfies FakeAdapter
}

/** A ready-made `AdapterContext` for tests. */
export function fakeContext(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    credentials: { apiKey: 'test-key' },
    fetch: (async () => {
      throw new Error('fakeContext.fetch was called; pass an explicit fetch')
    }) as unknown as typeof globalThis.fetch,
    signal: new AbortController().signal,
    ...overrides,
  }
}
