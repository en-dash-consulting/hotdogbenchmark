import { describe, expect, it } from 'vitest'
import {
  measure,
  normalizeUsage,
  startMeasurement,
  tokensPerSecond,
  type Clock,
} from '../../src/providers/timing.ts'
import { usageSchema } from '../../src/schema/run.ts'

/** A clock driven by hand, so timing assertions are exact rather than flaky. */
function fakeClock(
  startWall = '2026-09-01T12:00:00.000Z',
): Clock & { advance: (ms: number) => void } {
  let elapsed = 0
  return {
    now: () => elapsed,
    wallClock: () => new Date(startWall),
    advance: (ms: number) => {
      elapsed += ms
    },
  }
}

describe('startMeasurement', () => {
  it('always reports totalMs', () => {
    const clock = fakeClock()
    const measurement = startMeasurement(clock)
    clock.advance(842)
    expect(measurement.finish()).toEqual({
      startedAt: '2026-09-01T12:00:00.000Z',
      ttfbMs: null,
      totalMs: 842,
    })
  })

  it('reports ttfbMs only when markFirstToken was called', () => {
    const clock = fakeClock()
    const measurement = startMeasurement(clock)
    clock.advance(310)
    measurement.markFirstToken()
    clock.advance(530)
    expect(measurement.finish()).toMatchObject({ ttfbMs: 310, totalMs: 840 })
  })

  it('keeps the first mark when a streaming parser calls it repeatedly', () => {
    const clock = fakeClock()
    const measurement = startMeasurement(clock)
    clock.advance(100)
    measurement.markFirstToken()
    clock.advance(100)
    measurement.markFirstToken()
    expect(measurement.finish().ttfbMs).toBe(100)
  })

  it('never produces a negative duration', () => {
    // A monotonic clock should not go backwards, but the guard is cheap and a
    // negative latency would silently poison every median downstream.
    let value = 100
    const clock: Clock = { now: () => value, wallClock: () => new Date(0) }
    const measurement = startMeasurement(clock)
    value = 40
    expect(measurement.finish().totalMs).toBe(0)
  })

  it('rounds to three decimals so the JSON stays stable', () => {
    let value = 0
    const clock: Clock = { now: () => value, wallClock: () => new Date(0) }
    const measurement = startMeasurement(clock)
    value = 12.3456789
    expect(measurement.finish().totalMs).toBe(12.346)
  })
})

describe('measure', () => {
  it('times an operation and hands it a markFirstToken callback', async () => {
    const clock = fakeClock()
    const { value, timing } = await measure(async (markFirstToken) => {
      clock.advance(200)
      markFirstToken()
      clock.advance(400)
      return 'No'
    }, clock)

    expect(value).toBe('No')
    expect(timing).toMatchObject({ ttfbMs: 200, totalMs: 600 })
  })

  it('lets an operation that throws propagate rather than swallowing it', async () => {
    await expect(
      measure(async () => {
        throw new Error('provider exploded')
      }, fakeClock()),
    ).rejects.toThrow('provider exploded')
  })
})

describe('normalizeUsage', () => {
  it('requires input and output and derives a total when the vendor gives none', () => {
    expect(normalizeUsage({ inputTokens: 14, outputTokens: 2 })).toEqual({
      inputTokens: 14,
      outputTokens: 2,
      totalTokens: 16,
      reasoningTokens: null,
      cachedInputTokens: null,
    })
  })

  it("prefers the vendor's own total, which is what appears on the bill", () => {
    // Some vendors' totals do not equal input + output. Theirs wins.
    expect(normalizeUsage({ inputTokens: 14, outputTokens: 2, totalTokens: 20 }).totalTokens).toBe(
      20,
    )
  })

  it('keeps null distinct from zero for reasoning and cached tokens', () => {
    const notReported = normalizeUsage({ inputTokens: 1, outputTokens: 1 })
    const reportedAsZero = normalizeUsage({
      inputTokens: 1,
      outputTokens: 1,
      reasoningTokens: 0,
      cachedInputTokens: 0,
    })
    expect(notReported.reasoningTokens).toBeNull()
    expect(reportedAsZero.reasoningTokens).toBe(0)
    expect(notReported.cachedInputTokens).toBeNull()
    expect(reportedAsZero.cachedInputTokens).toBe(0)
  })

  it('treats undefined the same as null', () => {
    expect(
      normalizeUsage({ inputTokens: 1, outputTokens: 1, reasoningTokens: undefined })
        .reasoningTokens,
    ).toBeNull()
  })

  it('coerces to non-negative integers, since a fraction means a parsing mistake', () => {
    const usage = normalizeUsage({ inputTokens: 14.6, outputTokens: -3 })
    expect(usage.inputTokens).toBe(15)
    expect(usage.outputTokens).toBe(0)
  })

  it('survives NaN from a missing field rather than emitting NaN into the run file', () => {
    expect(normalizeUsage({ inputTokens: Number.NaN, outputTokens: 2 }).inputTokens).toBe(0)
  })

  it('always produces something the run schema accepts', () => {
    const cases = [
      { inputTokens: 0, outputTokens: 0 },
      { inputTokens: 14, outputTokens: 1, reasoningTokens: 128, cachedInputTokens: 8 },
      { inputTokens: 1.9, outputTokens: -1, totalTokens: Number.NaN },
    ]
    for (const parts of cases) {
      expect(usageSchema.safeParse(normalizeUsage(parts)).success).toBe(true)
    }
  })
})

describe('tokensPerSecond', () => {
  it('divides output tokens by total wall-clock seconds', () => {
    expect(tokensPerSecond(50, 1000)).toBe(50)
    expect(tokensPerSecond(3, 1500)).toBe(2)
  })

  it('returns null rather than Infinity when no time elapsed', () => {
    expect(tokensPerSecond(5, 0)).toBeNull()
    expect(tokensPerSecond(5, -1)).toBeNull()
  })
})
