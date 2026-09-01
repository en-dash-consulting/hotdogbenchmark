import { describe, expect, it } from 'vitest'
import {
  aggregateSamples,
  emptyAggregate,
  majorityVerdict,
  statOf,
} from '../../src/runner/aggregate.ts'
import { estimateCost, formatCost, sumCosts } from '../../src/runner/cost.ts'
import { aggregateSchema } from '../../src/schema/run.ts'
import type { Sample, Verdict } from '../../src/schema/run.ts'
import type { Pricing } from '../../src/schema/models.ts'

function sample(overrides: Partial<Sample> = {}): Sample {
  return {
    text: 'No',
    verdict: 'no',
    followedInstruction: true,
    usage: {
      inputTokens: 15,
      outputTokens: 2,
      totalTokens: 17,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
    timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: 300, totalMs: 900 },
    costEstimateUsd: 0.000125,
    ...overrides,
  }
}

describe('statOf', () => {
  it('takes the middle observation for an odd count', () => {
    expect(statOf([900, 100, 500])).toEqual({ median: 500, min: 100, max: 900 })
  })

  it('averages the two middle observations for an even count', () => {
    expect(statOf([100, 200, 300, 400])).toEqual({ median: 250, min: 100, max: 400 })
  })

  it('handles a single observation', () => {
    expect(statOf([42])).toEqual({ median: 42, min: 42, max: 42 })
  })

  it('returns null for an empty list rather than inventing a zero', () => {
    expect(statOf([])).toBeNull()
  })

  it('ignores non-finite values that a bad division could produce', () => {
    expect(statOf([100, Number.NaN, Number.POSITIVE_INFINITY, 200])).toEqual({
      median: 150,
      min: 100,
      max: 200,
    })
    expect(statOf([Number.NaN])).toBeNull()
  })

  it('does not mutate its input', () => {
    const values = [3, 1, 2]
    statOf(values)
    expect(values).toEqual([3, 1, 2])
  })
})

describe('majorityVerdict', () => {
  it('returns the most common verdict', () => {
    expect(majorityVerdict(['no', 'no', 'yes'])).toBe('no')
    expect(majorityVerdict(['yes', 'yes', 'other'])).toBe('yes')
  })

  it('resolves a tie to other, because the model did not settle', () => {
    // Two yes and two no is not a yes. Picking either would be taking a side
    // on the model's behalf.
    expect(majorityVerdict(['yes', 'yes', 'no', 'no'])).toBe('other')
    expect(majorityVerdict(['yes', 'no'])).toBe('other')
  })

  it('returns a unanimous verdict unchanged', () => {
    expect(majorityVerdict(['yes', 'yes', 'yes'])).toBe('yes')
  })

  it('returns other when other genuinely wins', () => {
    expect(majorityVerdict(['other', 'other', 'yes'])).toBe('other')
  })

  it('returns null for no samples at all', () => {
    expect(majorityVerdict([])).toBeNull()
  })

  it('handles a single sample', () => {
    expect(majorityVerdict(['yes'])).toBe('yes')
  })
})

describe('aggregateSamples', () => {
  it('summarizes three ordinary samples', () => {
    const samples = [
      sample({ timing: { startedAt: 'x', ttfbMs: 200, totalMs: 800 } }),
      sample({ timing: { startedAt: 'x', ttfbMs: 300, totalMs: 900 } }),
      sample({ timing: { startedAt: 'x', ttfbMs: 400, totalMs: 1000 } }),
    ]
    const aggregate = aggregateSamples(samples)

    expect(aggregate.sampleCount).toBe(3)
    expect(aggregate.totalMs).toEqual({ median: 900, min: 800, max: 1000 })
    expect(aggregate.ttfbMs).toEqual({ median: 300, min: 200, max: 400 })
    expect(aggregate.verdict).toBe('no')
    expect(aggregate.followedInstructionRate).toBe(1)
  })

  it('excludes null ttfb values rather than counting them as zero', () => {
    // A non-streaming provider reports no first-token time. Treating that as
    // 0 ms would make it look instantaneous.
    const samples = [
      sample({ timing: { startedAt: 'x', ttfbMs: null, totalMs: 800 } }),
      sample({ timing: { startedAt: 'x', ttfbMs: 400, totalMs: 900 } }),
    ]
    expect(aggregateSamples(samples).ttfbMs).toEqual({ median: 400, min: 400, max: 400 })
  })

  it('reports ttfb as null when no sample had one', () => {
    const samples = [sample({ timing: { startedAt: 'x', ttfbMs: null, totalMs: 800 } })]
    expect(aggregateSamples(samples).ttfbMs).toBeNull()
  })

  it('computes followedInstructionRate as a 0..1 float', () => {
    const samples = [
      sample({ followedInstruction: true }),
      sample({ followedInstruction: true }),
      sample({ followedInstruction: false }),
      sample({ followedInstruction: false }),
    ]
    expect(aggregateSamples(samples).followedInstructionRate).toBe(0.5)
    expect(aggregateSamples([sample({ followedInstruction: false })]).followedInstructionRate).toBe(
      0,
    )
  })

  it('sums cost estimates rather than averaging them', () => {
    const samples = [
      sample({ costEstimateUsd: 0.0001 }),
      sample({ costEstimateUsd: 0.0002 }),
      sample({ costEstimateUsd: 0.0003 }),
    ]
    expect(aggregateSamples(samples).costEstimateUsd).toBe(0.0006)
  })

  it('reports cost as null when no sample had pricing', () => {
    expect(aggregateSamples([sample({ costEstimateUsd: null })]).costEstimateUsd).toBeNull()
  })

  it('computes tokens per second from output tokens over total time', () => {
    const samples = [
      sample({
        usage: {
          inputTokens: 10,
          outputTokens: 50,
          totalTokens: 60,
          reasoningTokens: null,
          cachedInputTokens: null,
        },
        timing: { startedAt: 'x', ttfbMs: null, totalMs: 1000 },
      }),
    ]
    expect(aggregateSamples(samples).tokensPerSecond?.median).toBe(50)
  })

  it('skips zero-duration samples rather than dividing by zero', () => {
    const samples = [sample({ timing: { startedAt: 'x', ttfbMs: null, totalMs: 0 } })]
    expect(aggregateSamples(samples).tokensPerSecond).toBeNull()
  })

  it('returns a well-defined empty aggregate for no samples, and does not throw', () => {
    const aggregate = aggregateSamples([])
    expect(() => aggregateSamples([])).not.toThrow()
    expect(aggregate).toEqual(emptyAggregate())
    expect(aggregate.sampleCount).toBe(0)
    expect(aggregate.verdict).toBeNull()
    expect(aggregate.followedInstructionRate).toBeNull()
  })

  it('always produces something the run schema accepts', () => {
    const cases: Sample[][] = [
      [],
      [sample()],
      [sample({ verdict: 'yes' }), sample({ verdict: 'no' })],
      [sample({ costEstimateUsd: null, timing: { startedAt: 'x', ttfbMs: null, totalMs: 0 } })],
    ]
    for (const samples of cases) {
      expect(aggregateSchema.safeParse(aggregateSamples(samples)).success).toBe(true)
    }
  })
})

describe('estimateCost', () => {
  const pricing: Pricing = {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
    pricingUrl: 'https://example.com/pricing',
    asOf: '2026-09-01',
  }
  const usage = {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    totalTokens: 2_000_000,
    reasoningTokens: null,
    cachedInputTokens: null,
  }

  it('computes USD from per-million-token rates', () => {
    expect(estimateCost(usage, pricing)).toBe(30)
  })

  it('handles the realistic case of a handful of tokens', () => {
    // 15 in at $5/MTok and 2 out at $25/MTok.
    const cost = estimateCost({ ...usage, inputTokens: 15, outputTokens: 2 }, pricing)
    expect(cost).toBeCloseTo(15 * 5e-6 + 2 * 25e-6, 9)
  })

  it('rounds to six decimals, since these are fractions of a cent', () => {
    const cost = estimateCost({ ...usage, inputTokens: 1, outputTokens: 0 }, pricing)
    expect(cost).toBe(0.000005)
  })

  it('returns null when pricing is absent entirely', () => {
    expect(estimateCost(usage, null)).toBeNull()
    expect(estimateCost(usage, undefined)).toBeNull()
  })

  it('returns null, not zero, when a rate is null', () => {
    // A model whose cost we do not know is not a free model.
    expect(estimateCost(usage, { ...pricing, inputUsdPerMTok: null })).toBeNull()
    expect(estimateCost(usage, { ...pricing, outputUsdPerMTok: null })).toBeNull()
  })

  it('charges cached input at the full rate, making the estimate an upper bound', () => {
    const withCache = { ...usage, cachedInputTokens: 900_000 }
    expect(estimateCost(withCache, pricing)).toBe(estimateCost(usage, pricing))
  })

  it('returns zero for a call that used no tokens', () => {
    expect(estimateCost({ ...usage, inputTokens: 0, outputTokens: 0 }, pricing)).toBe(0)
  })
})

describe('sumCosts', () => {
  it('adds known costs', () => {
    expect(sumCosts([0.0001, 0.0002])).toBe(0.0003)
  })

  it('ignores unknown costs rather than treating them as zero', () => {
    expect(sumCosts([0.0001, null, 0.0002])).toBe(0.0003)
  })

  it('returns null when nothing is known', () => {
    expect(sumCosts([null, null])).toBeNull()
    expect(sumCosts([])).toBeNull()
  })
})

describe('formatCost', () => {
  it('shows a dash for an unknown cost', () => {
    expect(formatCost(null)).toBe('—')
  })

  it('shows six decimals for sub-cent values, which is most of them', () => {
    // A plain currency format would render this as $0.00 and the column would
    // tell the reader nothing.
    expect(formatCost(0.000125)).toBe('$0.000125')
  })

  it('shows four decimals once a value is at least a cent', () => {
    expect(formatCost(1.5)).toBe('$1.5000')
  })

  it('shows a plain zero for an actual zero', () => {
    expect(formatCost(0)).toBe('$0')
  })
})

describe('verdict counting is exhaustive', () => {
  it('handles every verdict value the schema allows', () => {
    const all: Verdict[] = ['yes', 'no', 'other']
    for (const verdict of all) {
      expect(majorityVerdict([verdict, verdict])).toBe(verdict)
    }
  })
})
