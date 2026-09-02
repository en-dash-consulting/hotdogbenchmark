/**
 * The mock adapter — the whole pipeline, no keys, no network.
 *
 * `npm run bench -- run --mock` is the first command this project asks a
 * newcomer to run, and the one CI runs on every pull request. It replaces all
 * seven adapters with this one, which replays recorded responses from
 * `tests/fixtures/responses/`.
 *
 * The point is that **everything downstream is real**: answer classification,
 * aggregation, cost estimation, schema validation, the manifest, the site
 * build. Only the network call is simulated. A contributor can therefore change
 * the verdict rules or the leaderboard formula and see the effect immediately,
 * without an API key and without spending anything.
 *
 * ## Determinism
 *
 * Timings are simulated. With `BENCH_SEED` set they are deterministic, so two
 * mock runs of the same week produce byte-identical files and a diff means a
 * real change. Without a seed they vary a little, which is more realistic for
 * someone poking at the output.
 *
 * Note this file reads no environment: the seed is passed in. The Node-only
 * caller reads `BENCH_SEED`.
 */
import { normalizeUsage } from './timing.ts'
import { overrideAllAdapters } from './registry.ts'
import { ProviderError } from './types.ts'
import type { AdapterContext, CompleteRequest, CompleteResult, ProviderAdapter } from './types.ts'

/** One recorded answer for one question under one condition. */
export interface MockResponse {
  /** The question id this answer belongs to. */
  questionId: string
  /**
   * The condition it was recorded under. Informational; matching uses the
   * rendered `systemPrompt` below, which is what the adapter actually sees.
   */
  conditionId?: string
  /**
   * The system prompt this answer was recorded under, or null for none.
   * Absent on fixtures recorded before conditions existed, which means the
   * same as null.
   */
  systemPrompt?: string | null
  /** What the model said. */
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens?: number
    reasoningTokens?: number | null
    cachedInputTokens?: number | null
  }
  /** Roughly how long this provider takes, in milliseconds. */
  approxTotalMs: number
  /** Null for a provider that does not stream. */
  approxTtfbMs: number | null
}

/** A provider's recorded fixture file. */
export interface MockFixture {
  provider: string
  modelId: string
  /** `live` for a real capture, `authored` for one written to the documented shape. */
  source: 'live' | 'authored'
  recordedAt: string
  responses: MockResponse[]
}

export interface MockOptions {
  /** Provider id → its fixture. */
  fixtures: Map<string, MockFixture>
  /** Set for deterministic timings. */
  seed?: number
  /** Simulated delay is scaled by this. Tests use 0 to run instantly. */
  speed?: number
}

/**
 * Small deterministic PRNG.
 *
 * A named algorithm rather than something ad hoc, so "deterministic" is a
 * property someone can verify rather than take on trust.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a mock adapter for one provider.
 *
 * Matching is by question id, recovered from the prompt. A prompt with no
 * matching recorded response is an error rather than a default answer —
 * silently substituting one would let a mock run report results for a question
 * nobody recorded.
 */
export function createMockAdapter(providerId: string, options: MockOptions): ProviderAdapter {
  const speed = options.speed ?? 1

  return {
    id: providerId,
    displayName: `${providerId} (mock)`,

    async complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult> {
      // The model's own recording first; the provider's legacy single-model
      // fixture otherwise, so a fixture recorded before a provider had two
      // models still serves its first one.
      const fixture =
        options.fixtures.get(`${providerId}/${request.modelId}`) ?? options.fixtures.get(providerId)
      if (!fixture) {
        throw new ProviderError(
          'bad_response',
          `No recorded fixture for ${providerId} model "${request.modelId}". ` +
            `Record one with: npm run bench:record -- --provider ${providerId} --model ${request.modelId}`,
        )
      }

      const match = matchResponse(fixture, request.prompt, request.systemPrompt)
      if (!match) {
        throw new ProviderError(
          'bad_response',
          `No recorded response for this prompt in the ${providerId} fixture. ` +
            `Recorded questions: ${[...new Set(fixture.responses.map((r) => r.questionId))].join(', ')}`,
        )
      }
      const { response, exact } = match

      // Vary the recorded timing a little so charts are not perfectly flat.
      // Seeded from the provider, question and seed together, so the same
      // combination always produces the same number.
      const random = mulberry32(hash(`${options.seed ?? 0}:${providerId}:${response.questionId}`))
      const jitter = 0.85 + random() * 0.3
      const totalMs = Math.round(response.approxTotalMs * jitter)
      const ttfbMs =
        response.approxTtfbMs === null ? null : Math.round(response.approxTtfbMs * jitter)

      // A token gesture at real elapsed time so progress output is legible.
      // Tests set speed to 0 and skip it entirely.
      if (speed > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(totalMs * speed, 50)))
      }

      if (context.signal.aborted) {
        throw new ProviderError('timeout', 'Mock request cancelled')
      }
      context.onFirstToken?.()

      return {
        text: response.text,
        usage: normalizeUsage({
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens ?? null,
          reasoningTokens: response.usage.reasoningTokens ?? null,
          cachedInputTokens: response.usage.cachedInputTokens ?? null,
        }),
        timing: {
          startedAt: new Date(0).toISOString(),
          ttfbMs,
          totalMs,
        },
        raw: {
          mock: true,
          source: fixture.source,
          recordedAt: fixture.recordedAt,
          // Honest about a gap: a non-control arm replayed from the control
          // recording says so, rather than passing off one answer as another.
          ...(exact ? {} : { replayedFrom: 'control' }),
        },
      }
    },
  }
}

/**
 * Find the recorded response for a prompt and system prompt.
 *
 * The prompt is the question text, so the question id is recovered by matching
 * against the recorded subject rather than by passing the id through the
 * adapter interface — which would exist only for the mock's benefit and would
 * be a leak in the abstraction. The condition is recovered the same way, from
 * the system prompt the adapter was actually given.
 *
 * A recording under exactly this system prompt wins. Failing that, the control
 * recording (no system prompt) is replayed and the result says so, so a
 * fixture captured before conditions existed still runs — it just cannot show
 * any sensitivity for that provider.
 */
function matchResponse(
  fixture: MockFixture,
  prompt: string,
  systemPrompt: string | undefined,
): { response: MockResponse; exact: boolean } | undefined {
  const normalized = prompt.toLowerCase()
  const candidates = fixture.responses.filter((response) => {
    // "hot-dog" appears in the prompt as "hot dog".
    const subject = response.questionId.replace(/-/g, ' ')
    return normalized.includes(subject)
  })
  const wanted = systemPrompt ?? null

  const exact = candidates.find((response) => (response.systemPrompt ?? null) === wanted)
  if (exact) return { response: exact, exact: true }

  const control = candidates.find((response) => (response.systemPrompt ?? null) === null)
  return control ? { response: control, exact: false } : undefined
}

/** Stable string hash, so seeding does not depend on iteration order. */
function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

/**
 * Swap every registered adapter for its mock.
 *
 * Returns a restore function. The runner is not told any of this happened,
 * which is the point: mock mode exercises the real orchestration path.
 */
export function installMocks(options: MockOptions): () => void {
  return overrideAllAdapters((original) => createMockAdapter(original.id, options))
}
