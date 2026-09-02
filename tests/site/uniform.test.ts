import { describe, expect, it } from 'vitest'
import { uniformMeasures, uniformNote } from '../../src/site/lib/scores.ts'
import type { ModelResult, Sample, Verdict } from '../../src/schema/run.ts'

/**
 * The variance rule: a measure every model shares is not plotted.
 *
 * The Week 36 edition is the motivating case, every model at decisiveness
 * 1.00, so the fixtures here build that field and one where it varies.
 */
function sample(
  verdict: Verdict,
  followed: boolean,
  totalMs: number,
  outputTokens: number,
): Sample {
  return {
    text: verdict === 'other' ? 'Technically, yes.' : verdict === 'yes' ? 'Yes' : 'No',
    verdict,
    followedInstruction: followed,
    usage: {
      inputTokens: 15,
      outputTokens,
      totalTokens: 15 + outputTokens,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
    timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: totalMs / 3, totalMs },
    costEstimateUsd: 0.0001,
  }
}

function model(
  name: string,
  verdicts: Verdict[],
  { followed = true, totalMs = 900, outputTokens = 1 } = {},
): ModelResult {
  const samples = verdicts.map((v) => sample(v, followed, totalMs, outputTokens))
  return {
    provider: name.toLowerCase(),
    modelId: `${name.toLowerCase()}-1`,
    displayName: name,
    reasoningEffort: null,
    status: 'ok',
    samples,
    aggregate: {
      sampleCount: samples.length,
      totalMs: { median: totalMs, min: totalMs, max: totalMs },
      ttfbMs: { median: totalMs / 3, min: totalMs / 3, max: totalMs / 3 },
      inputTokens: { median: 15, min: 15, max: 15 },
      outputTokens: { median: outputTokens, min: outputTokens, max: outputTokens },
      totalTokens: { median: 16, min: 16, max: 16 },
      tokensPerSecond: { median: 1, min: 1, max: 1 },
      verdict: verdicts[0]!,
      followedInstructionRate: followed ? 1 : 0,
      costEstimateUsd: 0.0003,
    },
    error: null,
  }
}

describe('uniformMeasures', () => {
  it('finds decisiveness and compliance uniform when every model answers one word every time', () => {
    const field = [
      model('A', ['yes', 'yes', 'yes'], { totalMs: 400 }),
      model('B', ['no', 'no', 'no'], { totalMs: 2000, outputTokens: 30 }),
      model('C', ['no', 'no', 'no'], { totalMs: 900 }),
    ]
    const uniform = uniformMeasures(field)
    expect(uniform.decisiveness).toBe(true)
    expect(uniform.values.decisiveness).toBe(1)
    expect(uniform.compliance).toBe(true)
    expect(uniform.efficiency).toBe(false)
    expect(uniform.radar.has('decisiveness')).toBe(true)
    expect(uniform.radar.has('compliance')).toBe(true)
    expect(uniform.radar.has('speed')).toBe(false)
  })

  it('finds nothing uniform when one model hedges', () => {
    const field = [
      model('A', ['yes', 'yes', 'yes'], { totalMs: 400 }),
      model('B', ['other', 'other', 'other'], { totalMs: 2000, outputTokens: 12, followed: false }),
    ]
    const uniform = uniformMeasures(field)
    expect(uniform.decisiveness).toBe(false)
    expect(uniform.compliance).toBe(false)
    expect(uniform.radar.size).toBe(0)
  })

  it('treats a single model as varying, since there is nothing to be uniform with', () => {
    expect(uniformMeasures([model('A', ['yes'])]).decisiveness).toBe(false)
  })

  it('ignores errored models, which have no measures to compare', () => {
    const errored: ModelResult = {
      ...model('E', ['no']),
      status: 'error',
      samples: [],
      error: { category: 'server', message: 'down', retryable: true, providerStatus: 503 },
    }
    const field = [model('A', ['yes', 'yes']), model('B', ['no', 'no'], { totalMs: 3000 }), errored]
    expect(uniformMeasures(field).decisiveness).toBe(true)
  })
})

describe('uniformNote', () => {
  it('says what was uniform and why it is not drawn', () => {
    const field = [model('A', ['yes', 'yes']), model('B', ['no', 'no'], { totalMs: 3000 })]
    const note = uniformNote(uniformMeasures(field))
    expect(note).toContain('1.00 on decisiveness')
    expect(note).toContain('not plotted')
  })

  it('is empty when both axes vary', () => {
    const field = [
      model('A', ['yes', 'yes'], { totalMs: 400 }),
      model('B', ['other', 'no'], { totalMs: 3000 }),
    ]
    expect(uniformNote(uniformMeasures(field))).toBe('')
  })
})
