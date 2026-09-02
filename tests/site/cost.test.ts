import { describe, expect, it } from 'vitest'
import { formatCost, questionCost, runCost } from '../../src/site/lib/cost.ts'
import type { BenchmarkRun } from '../../src/schema/run.ts'

const sample = (cost: number | null) =>
  ({
    text: 'No',
    verdict: 'no',
    followedInstruction: true,
    usage: {
      inputTokens: 10,
      outputTokens: 1,
      totalTokens: 11,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
    timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: 100, totalMs: 300 },
    costEstimateUsd: cost,
  }) as const

const cell = (questionId: string, conditionId: string, costs: Array<number | null>) => ({
  questionId,
  conditionId,
  prompt: 'q',
  systemPrompt: null,
  models: [
    {
      provider: 'p',
      modelId: 'm',
      displayName: 'M',
      reasoningEffort: null,
      status: 'ok' as const,
      samples: costs.map(sample),
      aggregate: {
        sampleCount: costs.length,
        totalMs: null,
        ttfbMs: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        tokensPerSecond: null,
        verdict: 'no' as const,
        followedInstructionRate: 1,
        costEstimateUsd: null,
      },
      error: null,
    },
  ],
})

const run = {
  questions: [
    { id: 'a', text: 'A? One word answer.' },
    { id: 'b', text: 'B? One word answer.' },
  ],
  results: [
    cell('a', 'control', [0.01, 0.02]),
    cell('a', 'asserted', [0.03]),
    cell('b', 'control', [null, null]),
  ],
} as unknown as BenchmarkRun

describe('questionCost', () => {
  it('sums every sample across every framing of one question', () => {
    expect(questionCost(run, 'a')).toBe(0.06)
  })

  it('is null when no sample carried an estimate', () => {
    expect(questionCost(run, 'b')).toBeNull()
  })
})

describe('runCost', () => {
  it('sums the questions that have estimates', () => {
    expect(runCost(run)).toBe(0.06)
  })

  it('is null for an edition with no estimates at all', () => {
    expect(runCost({ questions: [], results: [] } as unknown as BenchmarkRun)).toBeNull()
  })
})

describe('formatCost', () => {
  it('prints cents, and says so below half a cent', () => {
    expect(formatCost(0.2437)).toBe('$0.24')
    expect(formatCost(0.004)).toBe('under a cent')
    expect(formatCost(null)).toBe('—')
  })
})
