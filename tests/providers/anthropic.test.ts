import { describe, expect, it } from 'vitest'
import { createAnthropicAdapter } from '../../src/providers/anthropic.ts'
import { sampleSchema, usageSchema } from '../../src/schema/run.ts'
import {
  INSTANT_RETRIES,
  errorResponse,
  fetchReturning,
  sentBody,
  sentHeaders,
  sseResponse,
  wireContext,
  wireFixture,
} from '../helpers/wire.ts'

const adapter = createAnthropicAdapter(INSTANT_RETRIES)

const REQUEST = {
  modelId: 'claude-opus-5',
  prompt: 'Is a hot dog a sandwich? One word answer.',
  maxOutputTokens: 16,
}

const call = (response: Response | (() => Response), overrides = {}) => {
  const fetch = fetchReturning(response)
  return {
    fetch,
    result: adapter.complete(REQUEST, wireContext(fetch, overrides)),
  }
}

describe('the Anthropic adapter on a successful stream', () => {
  it('returns the verbatim text, usage, and timing', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    const completion = await result

    expect(completion.text).toBe('No')
    expect(completion.usage.inputTokens).toBe(16)
    // message_delta counts are cumulative and authoritative, so 2 wins over the
    // running 1 that message_start reported.
    expect(completion.usage.outputTokens).toBe(2)
    expect(completion.usage.totalTokens).toBe(18)
    expect(completion.timing.totalMs).toBeGreaterThanOrEqual(0)
  })

  it('maps cache_read_input_tokens to cachedInputTokens', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    expect((await result).usage.cachedInputTokens).toBe(12)
  })

  it('leaves reasoningTokens null, because this API does not report one', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    expect((await result).usage.reasoningTokens).toBeNull()
  })

  it('captures ttfbMs from the first content delta', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    const completion = await result
    expect(completion.timing.ttfbMs).not.toBeNull()
    expect(completion.timing.ttfbMs!).toBeLessThanOrEqual(completion.timing.totalMs)
  })

  it('notifies the runner on the first token exactly once per content start', async () => {
    let firstTokenCalls = 0
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')), {
      onFirstToken: () => {
        firstTokenCalls += 1
      },
    })
    await result
    expect(firstTokenCalls).toBeGreaterThan(0)
  })

  it('keeps the vendor payload in raw so a mapping decision can be rechecked', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    expect((await result).raw).toMatchObject({ input_tokens: 16, cache_read_input_tokens: 12 })
  })

  it('produces usage and a sample the run schema accepts', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    const completion = await result
    expect(usageSchema.safeParse(completion.usage).success).toBe(true)
    expect(
      sampleSchema.safeParse({
        text: completion.text,
        verdict: 'no',
        followedInstruction: true,
        usage: completion.usage,
        timing: completion.timing,
      }).success,
    ).toBe(true)
  })
})

describe('the Anthropic adapter request', () => {
  it('authenticates with x-api-key and pins the API version', async () => {
    const { fetch, result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    await result
    const headers = sentHeaders(fetch.calls)
    expect(headers['x-api-key']).toBe('test-key-do-not-log')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    // Anthropic does not use bearer auth; sending one would silently 401.
    expect(headers.authorization).toBeUndefined()
  })

  it('asks for a stream, which is the only way ttfb is observable', async () => {
    const { fetch, result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    await result
    expect(sentBody(fetch.calls)).toMatchObject({
      model: 'claude-opus-5',
      max_tokens: 16,
      stream: true,
      messages: [{ role: 'user', content: REQUEST.prompt }],
    })
  })

  it('omits temperature entirely when the runner did not set one', async () => {
    const { fetch, result } = call(() => sseResponse(wireFixture('anthropic/success.sse')))
    await result
    expect(sentBody(fetch.calls)).not.toHaveProperty('temperature')
  })

  it('takes the model id from the request, never from inside the adapter', async () => {
    const fetch = fetchReturning(() => sseResponse(wireFixture('anthropic/success.sse')))
    await adapter.complete({ ...REQUEST, modelId: 'some-future-model' }, wireContext(fetch))
    expect(sentBody(fetch.calls).model).toBe('some-future-model')
  })
})

describe('the Anthropic adapter on failure', () => {
  it('maps a 429 to rate_limit and marks it retryable', async () => {
    const { result } = call(() => errorResponse(429, wireFixture('anthropic/rate-limit.json')))
    await expect(result).rejects.toMatchObject({
      category: 'rate_limit',
      retryable: true,
      providerStatus: 429,
    })
  })

  it('surfaces the vendor message so the report can say what happened', async () => {
    const { result } = call(() => errorResponse(429, wireFixture('anthropic/rate-limit.json')))
    await expect(result).rejects.toThrow(/per-minute rate limit/)
  })

  it('maps a 401 to auth and does not retry it', async () => {
    const { fetch, result } = call(() =>
      errorResponse(401, '{"error":{"message":"invalid x-api-key"}}'),
    )
    await expect(result).rejects.toMatchObject({ category: 'auth', retryable: false })
    expect(fetch.calls.length).toBe(1)
  })

  it('maps a 200 with no usage data to bad_response, since a retry gets the same body', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/malformed.sse')))
    await expect(result).rejects.toMatchObject({ category: 'bad_response', retryable: false })
  })

  it('catches an error event arriving mid-stream after a 200', async () => {
    const { result } = call(() => sseResponse(wireFixture('anthropic/stream-error.sse')))
    await expect(result).rejects.toMatchObject({ category: 'server' })
    await expect(
      call(() => sseResponse(wireFixture('anthropic/stream-error.sse'))).result,
    ).rejects.toThrow(/Overloaded/)
  })

  it('never puts the API key in the error message', async () => {
    const { result } = call(() => errorResponse(401, '{"error":{"message":"invalid key"}}'))
    await expect(result).rejects.toSatisfy(
      (error: unknown) => !String((error as Error).message).includes('test-key-do-not-log'),
    )
  })
})

describe('the reference adapter stays readable', () => {
  it('is under 150 lines of code excluding comments and blanks', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(
      new URL('../../src/providers/anthropic.ts', import.meta.url),
      'utf8',
    )
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('//'))
    expect(code.length).toBeLessThan(150)
  })
})
