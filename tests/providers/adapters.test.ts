import { describe, expect, it } from 'vitest'
import { createAnthropicAdapter } from '../../src/providers/anthropic.ts'
import { createOpenAiAdapter } from '../../src/providers/openai.ts'
import { createGeminiAdapter } from '../../src/providers/gemini.ts'
import { createXaiAdapter } from '../../src/providers/xai.ts'
import { createMistralAdapter } from '../../src/providers/mistral.ts'
import { createDeepSeekAdapter } from '../../src/providers/deepseek.ts'
import { createLlamaHostedAdapter } from '../../src/providers/llama-hosted.ts'
import { usageSchema } from '../../src/schema/run.ts'
import type { ProviderAdapter } from '../../src/providers/types.ts'
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

interface AdapterCase {
  id: string
  adapter: ProviderAdapter
  modelId: string
  /** Fixture directory under tests/fixtures/wire/. */
  dir: string
  /** Expected values decoded from that provider's success fixture. */
  expect: {
    text: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    reasoningTokens: number | null
    cachedInputTokens: number | null
  }
}

/**
 * Every adapter, driven through the same contract.
 *
 * The point of a table here is that "adapter" is a real abstraction: if one of
 * these needed its own version of a test below, the interface would be leaking.
 */
const CASES: AdapterCase[] = [
  {
    id: 'anthropic',
    adapter: createAnthropicAdapter(INSTANT_RETRIES),
    modelId: 'claude-opus-5',
    dir: 'anthropic',
    expect: {
      text: 'No',
      inputTokens: 16,
      outputTokens: 2,
      totalTokens: 18,
      reasoningTokens: null,
      cachedInputTokens: 12,
    },
  },
  {
    id: 'openai',
    adapter: createOpenAiAdapter(INSTANT_RETRIES),
    modelId: 'gpt-5.6-sol',
    dir: 'openai',
    expect: {
      text: 'No',
      inputTokens: 15,
      outputTokens: 193,
      totalTokens: 208,
      reasoningTokens: 192,
      cachedInputTokens: 0,
    },
  },
  {
    id: 'gemini',
    adapter: createGeminiAdapter(INSTANT_RETRIES),
    modelId: 'gemini-3.7-flash',
    dir: 'gemini',
    expect: {
      text: 'No',
      inputTokens: 11,
      outputTokens: 1,
      // Gemini's own total includes thoughts tokens that candidatesTokenCount
      // excludes: 11 + 1 + 46 = 58, not 12.
      totalTokens: 58,
      reasoningTokens: 46,
      cachedInputTokens: 0,
    },
  },
  {
    id: 'xai',
    adapter: createXaiAdapter(INSTANT_RETRIES),
    modelId: 'grok-4.6',
    dir: 'xai',
    expect: {
      text: 'Yes',
      inputTokens: 647,
      outputTokens: 1,
      // Captured from a live call: total is prompt + completion + reasoning.
      totalTokens: 1295,
      reasoningTokens: 647,
      cachedInputTokens: 640,
    },
  },
  {
    id: 'mistral',
    adapter: createMistralAdapter(INSTANT_RETRIES),
    modelId: 'mistral-large-3-25-12',
    dir: 'mistral',
    expect: {
      text: 'No',
      inputTokens: 15,
      outputTokens: 1,
      totalTokens: 16,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
  },
  {
    id: 'deepseek',
    adapter: createDeepSeekAdapter(INSTANT_RETRIES),
    modelId: 'deepseek-v4-pro',
    dir: 'deepseek',
    expect: {
      text: 'No',
      inputTokens: 14,
      outputTokens: 1,
      totalTokens: 227,
      reasoningTokens: 212,
      // DeepSeek's own prompt_cache_hit_tokens, not OpenAI's nested field.
      cachedInputTokens: 12,
    },
  },
  {
    id: 'llama-hosted',
    adapter: createLlamaHostedAdapter(INSTANT_RETRIES),
    modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    dir: 'llama-hosted',
    expect: {
      text: 'No',
      inputTokens: 18,
      outputTokens: 1,
      totalTokens: 19,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
  },
]

const PROMPT = 'Is a hot dog a sandwich? One word answer.'

function invoke(testCase: AdapterCase, response: () => Response, overrides = {}) {
  const fetch = fetchReturning(response)
  return {
    fetch,
    result: testCase.adapter.complete(
      { modelId: testCase.modelId, prompt: PROMPT, maxOutputTokens: 16 },
      wireContext(fetch, overrides),
    ),
  }
}

describe.each(CASES)('the $id adapter', (testCase) => {
  const success = () => sseResponse(wireFixture(`${testCase.dir}/success.sse`))

  it('declares the provider id used in models.json', () => {
    expect(testCase.adapter.id).toBe(testCase.id)
  })

  it('returns the verbatim answer from a recorded stream', async () => {
    const { result } = invoke(testCase, success)
    expect((await result).text).toBe(testCase.expect.text)
  })

  it('maps the vendor usage payload onto the shared shape', async () => {
    const { result } = invoke(testCase, success)
    const { usage } = await result
    expect(usage).toEqual({
      inputTokens: testCase.expect.inputTokens,
      outputTokens: testCase.expect.outputTokens,
      totalTokens: testCase.expect.totalTokens,
      reasoningTokens: testCase.expect.reasoningTokens,
      cachedInputTokens: testCase.expect.cachedInputTokens,
    })
    expect(usageSchema.safeParse(usage).success).toBe(true)
  })

  it('records ttfbMs, since every one of these adapters streams', async () => {
    const { result } = invoke(testCase, success)
    const { timing } = await result
    expect(timing.ttfbMs).not.toBeNull()
    expect(timing.ttfbMs!).toBeLessThanOrEqual(timing.totalMs)
  })

  it('calls onFirstToken for the runner', async () => {
    let fired = false
    const { result } = invoke(testCase, success, {
      onFirstToken: () => {
        fired = true
      },
    })
    await result
    expect(fired).toBe(true)
  })

  it('sends the model id it was given rather than one of its own', async () => {
    const { fetch, result } = invoke(testCase, success)
    await result
    const body = sentBody(fetch.calls)
    const url = String(fetch.calls[0]?.url ?? '')
    // Gemini puts the model in the path; everyone else puts it in the body.
    expect(
      body.model === testCase.modelId || url.includes(encodeURIComponent(testCase.modelId)),
    ).toBe(true)
  })

  it('keeps the raw vendor payload for rechecking a mapping later', async () => {
    const { result } = invoke(testCase, success)
    expect((await result).raw).toBeTruthy()
  })

  it('maps a 429 to rate_limit and marks it retryable', async () => {
    const { result } = invoke(testCase, () =>
      errorResponse(429, wireFixture(`${testCase.dir}/rate-limit.json`)),
    )
    await expect(result).rejects.toMatchObject({
      category: 'rate_limit',
      retryable: true,
      providerStatus: 429,
    })
  })

  it('maps a 401 to auth and attempts it exactly once', async () => {
    const { fetch, result } = invoke(testCase, () =>
      errorResponse(401, '{"error":{"message":"invalid api key"}}'),
    )
    await expect(result).rejects.toMatchObject({ category: 'auth', retryable: false })
    expect(fetch.calls.length).toBe(1)
  })

  it('never leaks the API key into an error message', async () => {
    const { result } = invoke(testCase, () => errorResponse(500, '{"error":"boom"}'))
    await result.then(
      () => expect.unreachable('should have thrown'),
      (error: unknown) => {
        expect(String((error as Error).message)).not.toContain('test-key-do-not-log')
      },
    )
  })

  it('sends the key in a header, never in the URL where it would reach a log', async () => {
    const { fetch, result } = invoke(testCase, success)
    await result
    expect(String(fetch.calls[0]?.url)).not.toContain('test-key-do-not-log')
    const headers = sentHeaders(fetch.calls)
    const carriesKey = Object.values(headers).some((value) => value.includes('test-key-do-not-log'))
    expect(carriesKey).toBe(true)
  })
})

describe('adapters that cannot interpret a 200', () => {
  it.each(
    CASES.filter((c) => c.dir !== 'gemini').map((c) => ({
      id: c.id,
      testCase: c,
    })),
  )('$id maps a usage-less success to bad_response', async ({ testCase }) => {
    const { result } = invoke(testCase, () =>
      sseResponse(wireFixture(`${testCase.dir}/malformed.sse`)),
    )
    await expect(result).rejects.toMatchObject({ category: 'bad_response', retryable: false })
  })
})

describe('the Gemini adapter specifically', () => {
  const testCase = CASES.find((c) => c.id === 'gemini')!

  it('treats an empty candidate list as an error rather than an empty answer', async () => {
    // A filtered response is HTTP 200. Recording it as a model that answered
    // with "" would put a silent blank into the archive.
    const { result } = invoke(testCase, () =>
      sseResponse(wireFixture('gemini/empty-candidates.sse')),
    )
    await expect(result).rejects.toMatchObject({ category: 'bad_response' })
    await expect(
      invoke(testCase, () => sseResponse(wireFixture('gemini/empty-candidates.sse'))).result,
    ).rejects.toThrow(/blocked: SAFETY/)
  })

  it('authenticates with x-goog-api-key rather than the ?key= query parameter', async () => {
    const { fetch, result } = invoke(testCase, () => sseResponse(wireFixture('gemini/success.sse')))
    await result
    expect(sentHeaders(fetch.calls)['x-goog-api-key']).toBe('test-key-do-not-log')
    expect(String(fetch.calls[0]?.url)).toContain('alt=sse')
  })
})

describe('the xAI adapter specifically', () => {
  const testCase = CASES.find((c) => c.id === 'xai')!

  it('measures ttfb from the first content token, not the first reasoning token', async () => {
    // The recorded stream sends delta.reasoning_content chunks before any
    // delta.content. Counting those as the first token would report a ttfb of
    // near zero for a model that took eleven seconds to say anything.
    const fixture = wireFixture('xai/success.sse')
    expect(fixture).toContain('reasoning_content')
    const { result } = invoke(testCase, () => sseResponse(fixture))
    expect((await result).text).toBe('Yes')
  })

  it("keeps the vendor's total, which reasoning tokens make larger than input + output", async () => {
    const { result } = invoke(testCase, () => sseResponse(wireFixture('xai/success.sse')))
    const { usage } = await result
    expect(usage.totalTokens).toBe(1295)
    expect(usage.inputTokens + usage.outputTokens).toBe(648)
    expect(usage.totalTokens).toBeGreaterThan(usage.inputTokens + usage.outputTokens)
  })
})

describe('the DeepSeek adapter specifically', () => {
  const testCase = CASES.find((c) => c.id === 'deepseek')!

  it('reads cache hits from prompt_cache_hit_tokens, its own field name', async () => {
    const { result } = invoke(testCase, () => sseResponse(wireFixture('deepseek/success.sse')))
    expect((await result).usage.cachedInputTokens).toBe(12)
  })
})

describe('every recorded fixture', () => {
  it('contains no key-shaped strings', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const root = fileURLToPath(new URL('../fixtures/', import.meta.url))

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = `${dir}/${name}`
        return statSync(full).isDirectory() ? walk(full) : [full]
      })

    // Prefixes the seven providers actually use for their keys.
    const KEY_SHAPES = [/sk-[A-Za-z0-9_-]{16,}/, /xai-[A-Za-z0-9]{16,}/, /AIza[A-Za-z0-9_-]{20,}/]

    for (const file of walk(root)) {
      const content = readFileSync(file, 'utf8')
      for (const shape of KEY_SHAPES) {
        expect(shape.test(content), `${file} looks like it contains a key`).toBe(false)
      }
    }
  })
})
