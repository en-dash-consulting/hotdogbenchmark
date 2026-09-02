import { describe, expect, it } from 'vitest'
import { MIGRATED_CONTROL_CONDITION } from '../../src/data/migrate.ts'
import {
  bandCenters,
  bandWidth,
  boundsOf,
  linePath,
  plotArea,
  polarPoint,
  polygonPath,
  round,
  scaleLinear,
  ticks,
} from '../../src/site/lib/scale.ts'
import {
  latencySpread,
  latestDelta,
  metricOverTime,
  positionChanges,
  runOverRunChanges,
  sampleConsistency,
  sensitivityOverTime,
  verdictShareOverTime,
} from '../../src/site/lib/history.ts'
import type { BenchmarkRun, ModelResult, Verdict } from '../../src/schema/run.ts'

describe('boundsOf', () => {
  it('includes zero by default so a chart cannot exaggerate differences', () => {
    // An axis starting at 400 is the oldest trick in misleading dataviz.
    expect(boundsOf([400, 500])).toEqual({ min: 0, max: 500 })
  })

  it('can omit zero for sparklines, where shape is the point', () => {
    expect(boundsOf([400, 500], false)).toEqual({ min: 400, max: 500 })
  })

  it('gives a flat series a usable range rather than dividing by zero', () => {
    const bounds = boundsOf([5, 5, 5], false)
    expect(bounds.max).toBeGreaterThan(bounds.min)
  })

  it('handles an all-zero series', () => {
    expect(boundsOf([0, 0])).toEqual({ min: 0, max: 1 })
  })

  it('handles an empty series', () => {
    expect(boundsOf([])).toEqual({ min: 0, max: 1 })
  })

  it('ignores non-finite values', () => {
    expect(boundsOf([1, Number.NaN, 10, Number.POSITIVE_INFINITY])).toEqual({ min: 0, max: 10 })
  })
})

describe('scaleLinear', () => {
  it('maps the bounds onto the range endpoints', () => {
    const bounds = { min: 0, max: 10 }
    expect(scaleLinear(0, bounds, { start: 0, end: 100 })).toBe(0)
    expect(scaleLinear(10, bounds, { start: 0, end: 100 })).toBe(100)
    expect(scaleLinear(5, bounds, { start: 0, end: 100 })).toBe(50)
  })

  it('supports an inverted range, which is how y axes work in SVG', () => {
    expect(scaleLinear(10, { min: 0, max: 10 }, { start: 100, end: 0 })).toBe(0)
  })

  it('does not divide by zero on degenerate bounds', () => {
    expect(scaleLinear(5, { min: 5, max: 5 }, { start: 0, end: 100 })).toBe(0)
  })
})

describe('plotArea', () => {
  it('subtracts padding from the box', () => {
    const area = plotArea({
      width: 100,
      height: 50,
      padding: { top: 5, right: 5, bottom: 10, left: 20 },
    })
    expect(area).toEqual({ x: 20, y: 5, width: 75, height: 35 })
  })

  it('never returns a negative dimension', () => {
    const area = plotArea({
      width: 10,
      height: 10,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
    })
    expect(area.width).toBe(0)
    expect(area.height).toBe(0)
  })
})

describe('band helpers', () => {
  it('spaces band centers evenly', () => {
    expect(bandCenters(2, 0, 100)).toEqual([25, 75])
  })

  it('centers a single band', () => {
    expect(bandCenters(1, 0, 100)).toEqual([50])
  })

  it('returns nothing for zero bands', () => {
    expect(bandCenters(0, 0, 100)).toEqual([])
    expect(bandWidth(0, 0, 100)).toBe(0)
  })

  it('leaves a gap between bands', () => {
    expect(bandWidth(2, 0, 100, 0.25)).toBe(37.5)
  })
})

describe('linePath', () => {
  it('moves to the first point and lines to the rest', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
      ]),
    ).toBe('M0 10 L5 20')
  })

  it('breaks the line at a null rather than interpolating across it', () => {
    // A model absent for a week should show a gap. Drawing through it would
    // invent data that was never collected.
    expect(linePath([{ x: 0, y: 0 }, null, { x: 10, y: 10 }])).toBe('M0 0 M10 10')
  })

  it('returns an empty path for no points', () => {
    expect(linePath([])).toBe('')
    expect(linePath([null, null])).toBe('')
  })
})

describe('polygonPath and polarPoint', () => {
  it('closes a polygon', () => {
    expect(
      polygonPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]),
    ).toBe('M0 0 L10 0 L5 10 Z')
  })

  it('starts a radar at the top', () => {
    const point = polarPoint({ x: 50, y: 50 }, 10, 0, 4)
    expect(point.x).toBe(50)
    expect(point.y).toBe(40)
  })

  it('spaces radar axes evenly around the circle', () => {
    const points = Array.from({ length: 4 }, (_, i) => polarPoint({ x: 0, y: 0 }, 10, i, 4))
    expect(points.map((p) => round(Math.hypot(p.x, p.y)))).toEqual([10, 10, 10, 10])
  })
})

describe('ticks', () => {
  it('snaps to the 1/2/5/10 nice-step set rather than dividing exactly', () => {
    // A raw step of 25 rounds up to 50, because 2.5x a power of ten is not in
    // the nice set. Three round ticks read better than five awkward ones.
    expect(ticks({ min: 0, max: 100 }, 4)).toEqual([0, 50, 100])
    expect(ticks({ min: 0, max: 40 }, 4)).toEqual([0, 10, 20, 30, 40])
    // Same rule at a different magnitude: a raw step of 0.25 snaps to 0.5.
    expect(ticks({ min: 0, max: 1 }, 4)).toEqual([0, 0.5, 1])
    expect(ticks({ min: 0, max: 1 }, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
  })

  it('handles a degenerate range', () => {
    expect(ticks({ min: 5, max: 5 })).toEqual([5])
  })

  it('produces a sane number of ticks for an awkward range', () => {
    const result = ticks({ min: 0, max: 8347 }, 4)
    expect(result.length).toBeGreaterThan(1)
    expect(result.length).toBeLessThan(10)
  })
})

// --- History -------------------------------------------------------------

function model(provider: string, verdict: Verdict | null, totalMs = 900): ModelResult {
  const ok = verdict !== null
  return {
    provider,
    modelId: `${provider}-1`,
    displayName: provider,
    reasoningEffort: null,
    status: ok ? 'ok' : 'error',
    samples: ok
      ? [
          {
            text: 'x',
            verdict,
            followedInstruction: true,
            usage: {
              inputTokens: 1,
              outputTokens: 1,
              totalTokens: 2,
              reasoningTokens: null,
              cachedInputTokens: null,
            },
            timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: null, totalMs },
            costEstimateUsd: null,
          },
        ]
      : [],
    aggregate: {
      sampleCount: ok ? 1 : 0,
      totalMs: ok ? { median: totalMs, min: totalMs, max: totalMs } : null,
      ttfbMs: null,
      inputTokens: null,
      outputTokens: ok ? { median: 1, min: 1, max: 1 } : null,
      totalTokens: null,
      tokensPerSecond: null,
      verdict,
      followedInstructionRate: ok ? 1 : null,
      costEstimateUsd: null,
    },
    error: ok ? null : { category: 'server', message: 'x', retryable: true, providerStatus: 503 },
  }
}

function run(isoWeek: string, models: ModelResult[]): BenchmarkRun {
  return {
    schemaVersion: 2,
    runId: `run-${isoWeek}`,
    isoWeek,
    startedAt: '2026-09-01T12:00:00.000Z',
    finishedAt: '2026-09-01T12:05:00.000Z',
    runnerVersion: '0.1.0',
    gitSha: null,
    isMock: false,
    questions: [{ id: 'hot-dog', text: 'Is a hot dog a sandwich? One word answer.' }],
    conditions: [MIGRATED_CONTROL_CONDITION],
    results: [
      {
        questionId: 'hot-dog',
        conditionId: 'control',
        prompt: 'Is a hot dog a sandwich? One word answer.',
        systemPrompt: null,
        models,
      },
    ],
  }
}

describe('verdictShareOverTime', () => {
  it('counts each model once, oldest edition first', () => {
    const runs = [
      run('2026-W36', [model('a', 'yes'), model('b', 'no')]),
      run('2026-W35', [model('a', 'no'), model('b', 'no')]),
    ]
    expect(verdictShareOverTime(runs, 'hot-dog')).toEqual([
      { isoWeek: '2026-W35', counts: { yes: 0, no: 2, other: 0 } },
      { isoWeek: '2026-W36', counts: { yes: 1, no: 1, other: 0 } },
    ])
  })

  it('excludes models with no verdict', () => {
    const runs = [run('2026-W36', [model('a', 'yes'), model('b', null)])]
    expect(verdictShareOverTime(runs, 'hot-dog')[0]!.counts).toEqual({ yes: 1, no: 0, other: 0 })
  })

  it('skips editions that did not ask the question', () => {
    const without = run('2026-W35', [])
    without.results = []
    expect(
      verdictShareOverTime([run('2026-W36', [model('a', 'yes')]), without], 'hot-dog'),
    ).toHaveLength(1)
  })
})

describe('positionChanges', () => {
  it('finds a model that changed its verdict between consecutive editions', () => {
    const runs = [run('2026-W36', [model('a', 'yes')]), run('2026-W35', [model('a', 'no')])]
    const changes = positionChanges(runs, 'hot-dog')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      provider: 'a',
      from: 'no',
      to: 'yes',
      fromEdition: '2026-W35',
      toEdition: '2026-W36',
    })
  })

  it('reports nothing when nothing changed', () => {
    const runs = [run('2026-W36', [model('a', 'yes')]), run('2026-W35', [model('a', 'yes')])]
    expect(positionChanges(runs, 'hot-dog')).toEqual([])
  })

  it('finds several changes across several editions', () => {
    const runs = [
      run('2026-W36', [model('a', 'yes'), model('b', 'no')]),
      run('2026-W35', [model('a', 'no'), model('b', 'no')]),
      run('2026-W34', [model('a', 'no'), model('b', 'yes')]),
    ]
    expect(positionChanges(runs, 'hot-dog')).toHaveLength(2)
  })

  it('does not treat an outage as a change of position', () => {
    // A model that was unavailable has a gap, not a revised opinion.
    // Manufacturing drama out of a 503 would be dishonest.
    const runs = [
      run('2026-W36', [model('a', 'yes')]),
      run('2026-W35', [model('a', null)]),
      run('2026-W34', [model('a', 'no')]),
    ]
    expect(positionChanges(runs, 'hot-dog')).toEqual([])
  })

  it('does not treat a newly added model as a change', () => {
    const runs = [
      run('2026-W36', [model('a', 'yes'), model('b', 'no')]),
      run('2026-W35', [model('a', 'yes')]),
    ]
    expect(positionChanges(runs, 'hot-dog')).toEqual([])
  })

  it('handles a single edition', () => {
    expect(positionChanges([run('2026-W36', [model('a', 'yes')])], 'hot-dog')).toEqual([])
  })

  it('handles no editions', () => {
    expect(positionChanges([], 'hot-dog')).toEqual([])
  })
})

describe('metricOverTime', () => {
  it('returns one series per model, oldest edition first', () => {
    const runs = [
      run('2026-W36', [model('a', 'yes', 500)]),
      run('2026-W35', [model('a', 'yes', 900)]),
    ]
    const series = metricOverTime(runs, 'hot-dog', (r) => r.aggregate.totalMs?.median)
    expect(series).toHaveLength(1)
    expect(series[0]!.points).toEqual([
      { isoWeek: '2026-W35', value: 900 },
      { isoWeek: '2026-W36', value: 500 },
    ])
  })

  it('records a null for an edition where the model produced nothing', () => {
    const runs = [run('2026-W36', [model('a', null)]), run('2026-W35', [model('a', 'yes', 700)])]
    const series = metricOverTime(runs, 'hot-dog', (r) => r.aggregate.totalMs?.median)
    expect(series[0]!.points.map((p) => p.value)).toEqual([700, null])
  })

  it('records a null for an edition the model was absent from entirely', () => {
    const runs = [run('2026-W36', [model('a', 'yes', 700)]), run('2026-W35', [])]
    const series = metricOverTime(runs, 'hot-dog', (r) => r.aggregate.totalMs?.median)
    expect(series[0]!.points.map((p) => p.value)).toEqual([null, 700])
  })
})

describe('latestDelta', () => {
  it('compares the two most recent non-null values', () => {
    expect(latestDelta([{ value: 100 }, { value: 150 }])).toBe(50)
  })

  it('skips nulls when finding the pair', () => {
    expect(latestDelta([{ value: 100 }, { value: null }, { value: 150 }])).toBe(50)
  })

  it('returns null when there is nothing to compare', () => {
    expect(latestDelta([{ value: 100 }])).toBeNull()
    expect(latestDelta([])).toBeNull()
  })
})

describe('sampleConsistency', () => {
  it('lists every sample verdict per framing and scores agreement with the majority', () => {
    const mixed = model('a', 'no')
    mixed.samples = [mixed.samples[0]!, { ...mixed.samples[0]!, verdict: 'yes' }, mixed.samples[0]!]
    const edition = run('2026-W36', [mixed, model('b', 'yes')])
    const rows = sampleConsistency(edition, 'hot-dog')
    expect(rows.map((r) => r.displayName)).toEqual(['a', 'b'])
    expect(rows[0]?.byCondition[0]?.verdicts).toEqual(['no', 'yes', 'no'])
    expect(rows[0]?.agreement).toBeCloseTo(2 / 3, 3)
    expect(rows[1]?.agreement).toBe(1)
  })

  it('reports null agreement for a model with no verdict', () => {
    const rows = sampleConsistency(run('2026-W36', [model('down', null)]), 'hot-dog')
    expect(rows[0]?.agreement).toBeNull()
    expect(rows[0]?.byCondition[0]?.verdicts).toEqual([])
  })
})

describe('latencySpread', () => {
  it('returns the control arm min, median and max per answering model', () => {
    const rows = latencySpread(run('2026-W36', [model('a', 'no'), model('down', null)]), 'hot-dog')
    expect(rows.map((r) => r.displayName)).toEqual(['a'])
    expect(rows[0]).toMatchObject({ min: 900, median: 900, max: 900 })
  })
})

describe('sensitivityOverTime', () => {
  it('yields a gap for editions that ran only the control', () => {
    const series = sensitivityOverTime([run('2026-W36', [model('a', 'no')])])
    expect(series[0]?.points).toEqual([{ isoWeek: '2026-W36', value: null }])
  })
})

describe('runOverRunChanges', () => {
  it('finds the answer that changed between two runs of the same week', () => {
    const first = run('2026-W36', [model('a', 'no')])
    const second = run('2026-W36', [model('a', 'yes')])
    const changes = runOverRunChanges([first, second], 'hot-dog')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ from: 'no', to: 'yes' })
  })
})
