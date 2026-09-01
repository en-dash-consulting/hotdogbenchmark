import { describe, expect, it } from 'vitest'
import { assessProviderHealth, degradedProviders } from '../../src/runner/health.ts'
import type { BenchmarkRun, ModelResult } from '../../src/schema/run.ts'

function model(provider: string, status: 'ok' | 'error'): ModelResult {
  const ok = status === 'ok'
  return {
    provider,
    modelId: `${provider}-1`,
    displayName: provider,
    status,
    samples: ok
      ? [
          {
            text: 'No',
            verdict: 'no',
            followedInstruction: true,
            usage: {
              inputTokens: 1,
              outputTokens: 1,
              totalTokens: 2,
              reasoningTokens: null,
              cachedInputTokens: null,
            },
            timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: null, totalMs: 100 },
            costEstimateUsd: null,
          },
        ]
      : [],
    aggregate: {
      sampleCount: ok ? 1 : 0,
      totalMs: ok ? { median: 100, min: 100, max: 100 } : null,
      ttfbMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      verdict: ok ? 'no' : null,
      followedInstructionRate: ok ? 1 : null,
      costEstimateUsd: null,
    },
    error: ok
      ? null
      : { category: 'server', message: 'down', retryable: true, providerStatus: 503 },
  }
}

/** A run with one question and the given per-provider statuses. */
function run(isoWeek: string, statuses: Record<string, 'ok' | 'error'>): BenchmarkRun {
  return {
    schemaVersion: 1,
    runId: `run-${isoWeek}`,
    isoWeek,
    startedAt: '2026-09-01T12:00:00.000Z',
    finishedAt: '2026-09-01T12:05:00.000Z',
    runnerVersion: '0.1.0',
    gitSha: null,
    isMock: false,
    questions: [{ id: 'hot-dog', text: 'Is a hot dog a sandwich? One word answer.' }],
    results: [
      {
        questionId: 'hot-dog',
        models: Object.entries(statuses).map(([provider, status]) => model(provider, status)),
      },
    ],
  }
}

describe('assessProviderHealth', () => {
  it('flags a provider that failed all three most recent editions', () => {
    const runs = [
      run('2026-W36', { alpha: 'error', beta: 'ok' }),
      run('2026-W35', { alpha: 'error', beta: 'ok' }),
      run('2026-W34', { alpha: 'error', beta: 'ok' }),
    ]
    const health = assessProviderHealth(runs)
    expect(health.find((h) => h.provider === 'alpha')?.degraded).toBe(true)
    expect(health.find((h) => h.provider === 'beta')?.degraded).toBe(false)
  })

  it('does not flag a provider that recovered in the most recent edition', () => {
    const runs = [
      run('2026-W36', { alpha: 'ok' }),
      run('2026-W35', { alpha: 'error' }),
      run('2026-W34', { alpha: 'error' }),
    ]
    expect(degradedProviders(runs)).toEqual([])
  })

  it('does not flag a provider that failed only twice', () => {
    const runs = [
      run('2026-W36', { alpha: 'error' }),
      run('2026-W35', { alpha: 'error' }),
      run('2026-W34', { alpha: 'ok' }),
    ]
    expect(degradedProviders(runs)).toEqual([])
  })

  it('reports nothing when there are fewer editions than the threshold', () => {
    // A brand new fork's first two weeks must not open an issue.
    expect(assessProviderHealth([run('2026-W36', { alpha: 'error' })])).toEqual([])
    expect(
      assessProviderHealth([
        run('2026-W36', { alpha: 'error' }),
        run('2026-W35', { alpha: 'error' }),
      ]),
    ).toEqual([])
  })

  it('treats absence from an edition as breaking the streak, not extending it', () => {
    // A provider added two weeks ago has not "failed" the week before it
    // existed, and opening an issue against it would be nonsense.
    const runs = [
      run('2026-W36', { alpha: 'error' }),
      run('2026-W35', { alpha: 'error' }),
      run('2026-W34', { beta: 'ok' }), // alpha absent entirely
    ]
    expect(degradedProviders(runs)).toEqual([])
  })

  it('only considers the most recent editions, ignoring older history', () => {
    const runs = [
      run('2026-W36', { alpha: 'ok' }),
      run('2026-W35', { alpha: 'ok' }),
      run('2026-W34', { alpha: 'ok' }),
      run('2026-W33', { alpha: 'error' }),
      run('2026-W32', { alpha: 'error' }),
      run('2026-W31', { alpha: 'error' }),
    ]
    expect(degradedProviders(runs)).toEqual([])
  })

  it('flags several providers at once', () => {
    const runs = ['2026-W36', '2026-W35', '2026-W34'].map((week) =>
      run(week, { alpha: 'error', beta: 'error', gamma: 'ok' }),
    )
    expect(degradedProviders(runs)).toEqual(['alpha', 'beta'])
  })

  it('respects a custom threshold', () => {
    const runs = [run('2026-W36', { alpha: 'error' }), run('2026-W35', { alpha: 'error' })]
    expect(degradedProviders(runs, 2)).toEqual(['alpha'])
  })

  it('handles an empty history', () => {
    expect(() => assessProviderHealth([])).not.toThrow()
    expect(degradedProviders([])).toEqual([])
  })

  it('counts a partial result as a success, since it produced data', () => {
    const partial = run('2026-W36', { alpha: 'ok' })
    partial.results[0]!.models[0]!.status = 'partial'
    const runs = [partial, run('2026-W35', { alpha: 'error' }), run('2026-W34', { alpha: 'error' })]
    expect(degradedProviders(runs)).toEqual([])
  })
})
