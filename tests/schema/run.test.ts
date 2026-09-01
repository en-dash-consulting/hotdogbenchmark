import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SCHEMA_VERSION,
  benchmarkRunSchema,
  isoWeekSchema,
  parseBenchmarkRun,
  sampleSchema,
  usageSchema,
} from '../../src/schema/run.ts'

const example = JSON.parse(
  readFileSync(new URL('../fixtures/runs/example.json', import.meta.url), 'utf8'),
)

/** A structurally minimal run: one question, one model, one sample. */
function minimalRun(): Record<string, unknown> {
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: 'run-1',
    isoWeek: '2026-W36',
    startedAt: '2026-09-01T12:00:00.000Z',
    finishedAt: '2026-09-01T12:01:00.000Z',
    runnerVersion: '0.1.0',
    gitSha: null,
    isMock: true,
    questions: [{ id: 'hot-dog', text: 'Is a hot dog a sandwich? One word answer.' }],
    results: [
      {
        questionId: 'hot-dog',
        models: [
          {
            provider: 'anthropic',
            modelId: 'model-a',
            displayName: 'Model A',
            status: 'ok',
            samples: [
              {
                text: 'No',
                verdict: 'no',
                followedInstruction: true,
                usage: { inputTokens: 14, outputTokens: 1, totalTokens: 15 },
                timing: { startedAt: '2026-09-01T12:00:00.000Z', totalMs: 700 },
              },
            ],
            aggregate: {
              sampleCount: 1,
              totalMs: { median: 700, min: 700, max: 700 },
              ttfbMs: null,
              inputTokens: { median: 14, min: 14, max: 14 },
              outputTokens: { median: 1, min: 1, max: 1 },
              totalTokens: { median: 15, min: 15, max: 15 },
              tokensPerSecond: null,
              verdict: 'no',
              followedInstructionRate: 1,
            },
          },
        ],
      },
    ],
  }
}

describe('the committed example fixture', () => {
  it('validates', () => {
    expect(() => parseBenchmarkRun(example, 'tests/fixtures/runs/example.json')).not.toThrow()
  })

  it('covers three questions and includes a failed model', () => {
    const run = parseBenchmarkRun(example)
    expect(run.questions.map((q) => q.id)).toEqual(['hot-dog', 'hamburger', 'taco'])
    const statuses = run.results[0]!.models.map((m) => m.status)
    expect(statuses).toContain('ok')
    expect(statuses).toContain('error')
  })
})

describe('benchmarkRunSchema rejects', () => {
  it('a run missing schemaVersion', () => {
    const run = minimalRun()
    delete run.schemaVersion
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('schemaVersion')
  })

  it('a result referencing a questionId that is not in questions', () => {
    const run = minimalRun() as any
    run.results[0].questionId = 'grilled-cheese'
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('grilled-cheese')
  })

  it('duplicate question ids', () => {
    const run = minimalRun() as any
    run.questions.push({ ...run.questions[0] })
    expect(benchmarkRunSchema.safeParse(run).success).toBe(false)
  })

  it('a sample with negative token counts', () => {
    const run = minimalRun() as any
    run.results[0].models[0].samples[0].usage.outputTokens = -1
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('outputTokens')
  })

  it('a non-integer token count', () => {
    const run = minimalRun() as any
    run.results[0].models[0].samples[0].usage.inputTokens = 14.5
    expect(benchmarkRunSchema.safeParse(run).success).toBe(false)
  })

  it('a verdict outside yes|no|other', () => {
    const run = minimalRun() as any
    run.results[0].models[0].samples[0].verdict = 'maybe'
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('verdict')
  })

  it('finishedAt before startedAt', () => {
    const run = minimalRun() as any
    run.finishedAt = '2026-09-01T11:00:00.000Z'
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('finishedAt is before startedAt')
  })

  it('an errored model that still carries samples', () => {
    const run = minimalRun() as any
    run.results[0].models[0].status = 'error'
    run.results[0].models[0].error = { category: 'server', message: 'boom', retryable: true }
    expect(benchmarkRunSchema.safeParse(run).success).toBe(false)
  })

  it('an errored model that does not say why', () => {
    const run = minimalRun() as any
    run.results[0].models[0].status = 'error'
    run.results[0].models[0].samples = []
    run.results[0].models[0].aggregate.sampleCount = 0
    const result = benchmarkRunSchema.safeParse(run)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('must record why')
  })

  it('an ok model with no samples at all', () => {
    const run = minimalRun() as any
    run.results[0].models[0].samples = []
    expect(benchmarkRunSchema.safeParse(run).success).toBe(false)
  })

  it('a question id that is not a slug', () => {
    const run = minimalRun() as any
    run.questions[0].id = 'Hot Dog'
    run.results[0].questionId = 'Hot Dog'
    expect(benchmarkRunSchema.safeParse(run).success).toBe(false)
  })
})

describe('isoWeekSchema', () => {
  it.each(['2026-W01', '2026-W36', '2020-W53'])('accepts %s', (value) => {
    expect(isoWeekSchema.safeParse(value).success).toBe(true)
  })

  it.each(['2026-W00', '2026-W54', '2026-36', 'W36-2026', '26-W36'])('rejects %s', (value) => {
    expect(isoWeekSchema.safeParse(value).success).toBe(false)
  })
})

describe('nullable usage and timing fields', () => {
  it('default reasoningTokens and cachedInputTokens to null rather than 0', () => {
    const usage = usageSchema.parse({ inputTokens: 1, outputTokens: 2, totalTokens: 3 })
    expect(usage.reasoningTokens).toBeNull()
    expect(usage.cachedInputTokens).toBeNull()
  })

  it('default ttfbMs to null for non-streaming adapters', () => {
    const sample = sampleSchema.parse({
      text: 'No',
      verdict: 'no',
      followedInstruction: true,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      timing: { startedAt: '2026-09-01T12:00:00.000Z', totalMs: 100 },
    })
    expect(sample.timing.ttfbMs).toBeNull()
    expect(sample.costEstimateUsd).toBeNull()
  })
})

describe('parseBenchmarkRun', () => {
  it('names the file and the offending path in the thrown message', () => {
    const run = minimalRun() as any
    run.results[0].models[0].samples[0].usage.outputTokens = -1
    expect(() => parseBenchmarkRun(run, 'data/runs/2026-W36.json')).toThrow(
      /data\/runs\/2026-W36\.json/,
    )
    expect(() => parseBenchmarkRun(run, 'data/runs/2026-W36.json')).toThrow(
      /results\/0\/models\/0\/samples\/0\/usage\/outputTokens/,
    )
  })
})
