import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { planJobs, runBenchmark, type RunProgressEvent } from '../../src/runner/run.ts'
import { benchmarkRunSchema } from '../../src/schema/run.ts'
import { ProviderError } from '../../src/providers/types.ts'
import { makeFakeAdapter, type FakeAdapter } from '../helpers/fake-adapter.ts'
import type { ModelEntry } from '../../src/schema/models.ts'
import type { QuestionEntry } from '../../src/schema/questions.ts'

function question(id: string): QuestionEntry {
  return {
    id,
    subject: `a ${id}`,
    text: `Is a ${id} a sandwich? One word answer.`,
    reportTitle: `Sandwich Classification Benchmark: ${id}`,
    enabled: true,
  }
}

function model(provider: string, modelId = `${provider}-model`): ModelEntry {
  return {
    provider,
    modelId,
    displayName: `${provider} model`,
    vendor: provider,
    docsUrl: 'https://example.com/docs',
    pricing: {
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 25,
      pricingUrl: 'https://example.com/pricing',
      asOf: '2026-09-01',
    },
    supportsStreaming: true,
    supportsUsage: true,
    enabled: true,
  }
}

const FIXED_NOW = new Date('2026-09-01T12:00:00.000Z')

function baseOptions(
  adapters: Record<string, FakeAdapter>,
  overrides: Partial<Parameters<typeof runBenchmark>[0]> = {},
) {
  const providers = Object.keys(adapters)
  return {
    questions: [question('hot-dog')],
    models: providers.map((p) => model(p)),
    credentials: Object.fromEntries(providers.map((p) => [p, 'key'])),
    getAdapter: (id: string) => {
      const adapter = adapters[id]
      if (!adapter) throw new Error(`no fake adapter for ${id}`)
      return adapter
    },
    fetch: (() => {
      throw new Error('the runner must not call fetch itself')
    }) as unknown as typeof globalThis.fetch,
    samples: 3,
    concurrency: 3,
    now: () => FIXED_NOW,
    runId: 'test-run',
    runnerVersion: '0.1.0',
    ...overrides,
  }
}

describe('runBenchmark on a clean run', () => {
  it('asks every model every question the configured number of times', async () => {
    const adapters = {
      alpha: makeFakeAdapter({ id: 'alpha', answer: 'No' }),
      beta: makeFakeAdapter({ id: 'beta', answer: 'Yes' }),
    }
    const outcome = await runBenchmark(
      baseOptions(adapters, {
        questions: [question('hot-dog'), question('taco')],
        models: [model('alpha'), model('beta')],
        credentials: { alpha: 'k', beta: 'k' },
      }),
    )

    // 2 questions x 2 models x 3 samples
    expect(adapters.alpha.calls).toHaveLength(6)
    expect(adapters.beta.calls).toHaveLength(6)
    expect(outcome.okJobs).toBe(4)
    expect(outcome.errorJobs).toBe(0)
  })

  it('produces a run that validates against the schema', async () => {
    const outcome = await runBenchmark(baseOptions({ alpha: makeFakeAdapter({ id: 'alpha' }) }))
    expect(benchmarkRunSchema.safeParse(outcome.run).success).toBe(true)
  })

  it('stamps the ISO week derived from the injected clock', async () => {
    const outcome = await runBenchmark(baseOptions({ alpha: makeFakeAdapter({ id: 'alpha' }) }))
    expect(outcome.run.isoWeek).toBe('2026-W36')
    expect(outcome.run.startedAt).toBe('2026-09-01T12:00:00.000Z')
  })

  it('sends the question text as the prompt, from questions.json', async () => {
    const adapter = makeFakeAdapter({ id: 'alpha' })
    await runBenchmark(baseOptions({ alpha: adapter }))
    expect(adapter.calls[0]?.prompt).toBe('Is a hot-dog a sandwich? One word answer.')
  })

  it('classifies the answer and estimates cost for each sample', async () => {
    const outcome = await runBenchmark(
      baseOptions({ alpha: makeFakeAdapter({ id: 'alpha', answer: 'Yes' }) }),
    )
    const result = outcome.run.results[0]!.models[0]!
    expect(result.status).toBe('ok')
    expect(result.samples[0]?.verdict).toBe('yes')
    expect(result.samples[0]?.followedInstruction).toBe(true)
    expect(result.samples[0]?.costEstimateUsd).toBeGreaterThan(0)
    expect(result.aggregate.verdict).toBe('yes')
  })

  it('keeps results in question and model order, not completion order', async () => {
    // The slow provider is listed first, so ordering by completion would put
    // beta ahead of alpha and the run file's shape would depend on the network.
    const adapters = {
      alpha: makeFakeAdapter({ id: 'alpha', delayMs: 20 }),
      beta: makeFakeAdapter({ id: 'beta', delayMs: 0 }),
    }
    const outcome = await runBenchmark(
      baseOptions(adapters, {
        models: [model('alpha'), model('beta')],
        credentials: { alpha: 'k', beta: 'k' },
        samples: 1,
      }),
    )
    expect(outcome.run.results[0]!.models.map((m) => m.provider)).toEqual(['alpha', 'beta'])
  })
})

describe('runBenchmark tolerates partial failure', () => {
  it('records failing models as errors and succeeds overall', async () => {
    // 3 questions x 5 models, two of which throw: 9 ok jobs and 6 error jobs.
    const providers = ['a', 'b', 'c', 'd', 'e']
    const failing = new Set(['d', 'e'])
    const adapters = Object.fromEntries(
      providers.map((p) => [
        p,
        makeFakeAdapter({
          id: p,
          ...(failing.has(p) ? { failWith: new ProviderError('server', `${p} is down`) } : {}),
        }),
      ]),
    )

    const outcome = await runBenchmark(
      baseOptions(adapters, {
        questions: [question('hot-dog'), question('hamburger'), question('taco')],
        models: providers.map((p) => model(p)),
        credentials: Object.fromEntries(providers.map((p) => [p, 'k'])),
      }),
    )

    expect(outcome.okJobs).toBe(9)
    expect(outcome.errorJobs).toBe(6)
    expect(benchmarkRunSchema.safeParse(outcome.run).success).toBe(true)

    const statuses = outcome.run.results[0]!.models.map((m) => m.status)
    expect(statuses.filter((s) => s === 'ok')).toHaveLength(3)
    expect(statuses.filter((s) => s === 'error')).toHaveLength(2)
  })

  it('gives an errored model an empty aggregate and a reason', async () => {
    const outcome = await runBenchmark(
      baseOptions({
        alpha: makeFakeAdapter({
          id: 'alpha',
          failWith: new ProviderError('rate_limit', 'slow down', { providerStatus: 429 }),
        }),
      }),
    )
    const result = outcome.run.results[0]!.models[0]!
    expect(result.status).toBe('error')
    expect(result.samples).toEqual([])
    expect(result.aggregate.sampleCount).toBe(0)
    expect(result.aggregate.verdict).toBeNull()
    expect(result.error).toMatchObject({
      category: 'rate_limit',
      message: 'slow down',
      providerStatus: 429,
    })
  })

  it('reports every job failing without throwing', async () => {
    const outcome = await runBenchmark(
      baseOptions({
        alpha: makeFakeAdapter({ id: 'alpha', failWith: new ProviderError('server', 'down') }),
      }),
    )
    expect(outcome.okJobs).toBe(0)
    expect(outcome.errorJobs).toBe(1)
    // Still a valid run: a total outage is data too.
    expect(benchmarkRunSchema.safeParse(outcome.run).success).toBe(true)
  })

  it('skips models whose provider has no key rather than recording a fake outage', async () => {
    // Someone running with only one key must not get six errored models every
    // week — they were not asked, which is different from having failed.
    const outcome = await runBenchmark(
      baseOptions(
        { alpha: makeFakeAdapter({ id: 'alpha' }), beta: makeFakeAdapter({ id: 'beta' }) },
        {
          models: [model('alpha'), model('beta')],
          credentials: { alpha: 'k' },
        },
      ),
    )
    expect(outcome.run.results[0]!.models.map((m) => m.provider)).toEqual(['alpha'])
    expect(outcome.skipped).toEqual([{ provider: 'beta', modelId: 'beta-model' }])
    expect(outcome.errorJobs).toBe(0)
  })
})

describe('runBenchmark scheduling', () => {
  it('never has two calls in flight for the same provider', async () => {
    // Rate-limit skew: three simultaneous calls to one vendor invites a 429,
    // and the retried request's latency would measure our own impatience.
    const adapter = makeFakeAdapter({ id: 'alpha', delayMs: 5 })
    await runBenchmark(
      baseOptions(
        { alpha: adapter },
        {
          questions: [question('a'), question('b'), question('c')],
          concurrency: 5,
        },
      ),
    )
    expect(adapter.maxInFlight).toBe(1)
  })

  it('runs samples for one job sequentially', async () => {
    const adapter = makeFakeAdapter({ id: 'alpha', delayMs: 5 })
    await runBenchmark(baseOptions({ alpha: adapter }, { samples: 3 }))
    expect(adapter.calls).toHaveLength(3)
    expect(adapter.maxInFlight).toBe(1)
  })

  it('bounds total concurrency across providers', async () => {
    const providers = ['a', 'b', 'c', 'd', 'e', 'f']
    const adapters = Object.fromEntries(
      providers.map((p) => [p, makeFakeAdapter({ id: p, delayMs: 10 })]),
    )
    let peak = 0
    const tick = () => {
      peak = Math.max(peak, Object.values(adapters).filter((a) => a.inFlight > 0).length)
    }
    const interval = setInterval(tick, 1)

    await runBenchmark(
      baseOptions(adapters, {
        models: providers.map((p) => model(p)),
        credentials: Object.fromEntries(providers.map((p) => [p, 'k'])),
        concurrency: 2,
        samples: 1,
      }),
    )
    clearInterval(interval)
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('still uses parallelism across different providers', async () => {
    const adapters = {
      a: makeFakeAdapter({ id: 'a', delayMs: 30 }),
      b: makeFakeAdapter({ id: 'b', delayMs: 30 }),
      c: makeFakeAdapter({ id: 'c', delayMs: 30 }),
    }
    const started = Date.now()
    await runBenchmark(
      baseOptions(adapters, {
        models: [model('a'), model('b'), model('c')],
        credentials: { a: 'k', b: 'k', c: 'k' },
        concurrency: 3,
        samples: 1,
      }),
    )
    // Three 30ms calls in parallel should take well under three times 30ms.
    expect(Date.now() - started).toBeLessThan(80)
  })
})

describe('runBenchmark progress reporting', () => {
  it('emits start, per-sample and done events', async () => {
    const events: RunProgressEvent[] = []
    await runBenchmark(
      baseOptions(
        { alpha: makeFakeAdapter({ id: 'alpha' }) },
        {
          samples: 2,
          onProgress: (event) => events.push(event),
        },
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'job-start',
      'sample-done',
      'sample-done',
      'job-done',
    ])
  })

  it('emits a job-error event when a model produces nothing', async () => {
    const events: RunProgressEvent[] = []
    await runBenchmark(
      baseOptions(
        { alpha: makeFakeAdapter({ id: 'alpha', failWith: new ProviderError('server', 'x') }) },
        { onProgress: (event) => events.push(event) },
      ),
    )
    expect(events.at(-1)?.type).toBe('job-error')
  })
})

describe('planJobs', () => {
  it('enumerates question x model pairs without calling anything', () => {
    const plan = planJobs(
      [question('hot-dog'), question('taco')],
      [model('a'), model('b'), model('c')],
      { a: 'k', b: 'k' },
    )
    expect(plan.jobs).toHaveLength(4)
    expect(plan.skipped.map((m) => m.provider)).toEqual(['c'])
  })
})

describe('the runner core is runtime-agnostic', () => {
  it('imports no node builtins and reads no process.env', () => {
    const source = readFileSync(new URL('../../src/runner/run.ts', import.meta.url), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(code).not.toMatch(/from\s+['"]node:/)
    expect(code).not.toMatch(/process\s*\.\s*env/)
    expect(code).not.toMatch(/\brequire\(/)
  })

  it('never calls fetch itself — adapters do that', async () => {
    // baseOptions passes a fetch that throws. A clean run proves the runner
    // only hands it to adapters.
    await expect(
      runBenchmark(baseOptions({ alpha: makeFakeAdapter({ id: 'alpha' }) })),
    ).resolves.toBeDefined()
  })
})
