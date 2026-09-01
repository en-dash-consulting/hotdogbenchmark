import { describe, expect, it } from 'vitest'
import {
  RADAR_AXIS_LABELS,
  SCORE_DEFINITIONS,
  compositeScore,
  decisiveness,
  efficiency,
  radarAxes,
  scoreModels,
} from '../../src/site/lib/scores.ts'
import {
  complianceRate,
  consensusOf,
  executiveSummary,
  keyFindings,
  vendorVerdictLine,
} from '../../src/site/lib/prose.ts'
import {
  MOVEMENT_GLYPH,
  MOVEMENT_LABEL,
  rankModels,
  rankWithDeltas,
} from '../../src/site/lib/rank.ts'
import type { ModelResult, Sample, Verdict } from '../../src/schema/run.ts'

function sample(verdict: Verdict, followed = true, totalMs = 900, outputTokens = 1): Sample {
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

function result(
  name: string,
  verdicts: Verdict[],
  options: { followed?: boolean; totalMs?: number; outputTokens?: number } = {},
): ModelResult {
  const { followed = true, totalMs = 900, outputTokens = 1 } = options
  const samples = verdicts.map((v) => sample(v, followed, totalMs, outputTokens))
  const majority = verdicts[0]!
  return {
    provider: name.toLowerCase(),
    modelId: `${name.toLowerCase()}-1`,
    displayName: name,
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
      verdict: verdicts.every((v) => v === majority) ? majority : 'other',
      followedInstructionRate: followed ? 1 : 0,
      costEstimateUsd: 0.0003,
    },
    error: null,
  }
}

function errored(name: string): ModelResult {
  return {
    provider: name.toLowerCase(),
    modelId: `${name.toLowerCase()}-1`,
    displayName: name,
    status: 'error',
    samples: [],
    aggregate: {
      sampleCount: 0,
      totalMs: null,
      ttfbMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      verdict: null,
      followedInstructionRate: null,
      costEstimateUsd: null,
    },
    error: { category: 'server', message: 'unavailable', retryable: true, providerStatus: 503 },
  }
}

describe('decisiveness', () => {
  it('is 1 for a model that answers one word every time', () => {
    expect(decisiveness(result('A', ['yes', 'yes', 'yes']))).toBe(1)
  })

  it('is 0 for a model that hedges and never complies', () => {
    expect(decisiveness(result('A', ['other', 'other'], { followed: false }))).toBe(0)
  })

  it('is verdict-agnostic — yes and no score identically', () => {
    // There is no correct answer here. A score that preferred one would be a
    // claim this project cannot support.
    expect(decisiveness(result('A', ['yes', 'yes', 'yes']))).toBe(
      decisiveness(result('B', ['no', 'no', 'no'])),
    )
  })

  it('is 0 for a model with no samples', () => {
    expect(decisiveness(errored('A'))).toBe(0)
  })

  it('rewards partial commitment proportionally', () => {
    const mixed = decisiveness(result('A', ['yes', 'other']))
    expect(mixed).toBeGreaterThan(0)
    expect(mixed).toBeLessThan(1)
  })
})

describe('efficiency', () => {
  it('gives the fastest model in the field the top score', () => {
    const fast = result('Fast', ['yes'], { totalMs: 100 })
    const slow = result('Slow', ['yes'], { totalMs: 5000 })
    const peers = [fast, slow]
    expect(efficiency(fast, peers)).toBeGreaterThan(efficiency(slow, peers))
    expect(efficiency(fast, peers)).toBe(1)
  })

  it('gives every model 1 when they are indistinguishable', () => {
    // Nothing was slower than anything else, so nothing should be penalized.
    const a = result('A', ['yes'], { totalMs: 900 })
    const b = result('B', ['yes'], { totalMs: 900 })
    expect(efficiency(a, [a, b])).toBe(1)
  })

  it('handles a field of one', () => {
    const only = result('Only', ['yes'])
    expect(efficiency(only, [only])).toBe(1)
  })

  it('is 0 for a model with no measurements', () => {
    expect(efficiency(errored('A'), [result('B', ['yes'])])).toBe(0)
  })

  it('penalizes verbosity as well as slowness', () => {
    const terse = result('Terse', ['yes'], { totalMs: 900, outputTokens: 1 })
    const verbose = result('Verbose', ['yes'], { totalMs: 900, outputTokens: 400 })
    expect(efficiency(terse, [terse, verbose])).toBeGreaterThan(
      efficiency(verbose, [terse, verbose]),
    )
  })
})

describe('compositeScore and scoreModels', () => {
  it('stays within 0..1 for every shape of input', () => {
    const cases = [
      result('A', ['yes', 'yes', 'yes']),
      result('B', ['other'], { followed: false, totalMs: 20_000, outputTokens: 900 }),
      errored('C'),
    ]
    for (const entry of cases) {
      const score = compositeScore(entry, cases)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it('scores errored models rather than dropping them', () => {
    // Hiding an outage would quietly flatter whoever happened to be up.
    const scored = scoreModels([result('A', ['yes']), errored('B')])
    expect(scored).toHaveLength(2)
    expect(scored.find((s) => s.result.displayName === 'B')?.composite).toBe(0)
  })

  it('handles an empty field without throwing', () => {
    expect(() => scoreModels([])).not.toThrow()
    expect(scoreModels([])).toEqual([])
  })

  it('handles a field where every model errored', () => {
    const scored = scoreModels([errored('A'), errored('B')])
    expect(scored.every((s) => s.composite === 0)).toBe(true)
  })
})

describe('radarAxes', () => {
  it('produces five axes all within 0..1', () => {
    const peers = [result('A', ['yes'], { totalMs: 300 }), result('B', ['no'], { totalMs: 3000 })]
    const axes = radarAxes(peers[0]!, peers)
    expect(Object.keys(axes).sort()).toEqual(Object.keys(RADAR_AXIS_LABELS).sort())
    for (const value of Object.values(axes)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('gives an errored model zeroes rather than throwing', () => {
    const axes = radarAxes(errored('A'), [result('B', ['yes'])])
    expect(axes.decisiveness).toBe(0)
    expect(axes.speed).toBe(0)
  })
})

describe('SCORE_DEFINITIONS', () => {
  it('documents each score with a formula and a caveat', () => {
    expect(SCORE_DEFINITIONS.length).toBe(3)
    for (const definition of SCORE_DEFINITIONS) {
      expect(definition.formula.length).toBeGreaterThan(10)
      expect(definition.note.length).toBeGreaterThan(20)
    }
  })
})

describe('consensusOf', () => {
  it('finds a clear majority', () => {
    const consensus = consensusOf([result('A', ['no']), result('B', ['no']), result('C', ['yes'])])
    expect(consensus.verdict).toBe('no')
    expect(consensus.count).toBe(2)
    expect(consensus.share).toBeCloseTo(2 / 3)
    expect(consensus.unanimous).toBe(false)
    expect(consensus.dissenters.map((d) => d.displayName)).toEqual(['C'])
  })

  it('reports unanimity', () => {
    const consensus = consensusOf([result('A', ['yes']), result('B', ['yes'])])
    expect(consensus.unanimous).toBe(true)
    expect(consensus.dissenters).toEqual([])
  })

  it('reports no consensus on a tie rather than picking a side', () => {
    const consensus = consensusOf([result('A', ['yes']), result('B', ['no'])])
    expect(consensus.verdict).toBeNull()
  })

  it('ignores errored models when computing the share', () => {
    const consensus = consensusOf([result('A', ['yes']), result('B', ['yes']), errored('C')])
    expect(consensus.total).toBe(2)
    expect(consensus.unanimous).toBe(true)
  })

  it('handles every model having errored', () => {
    const consensus = consensusOf([errored('A'), errored('B')])
    expect(consensus.verdict).toBeNull()
    expect(consensus.total).toBe(0)
  })
})

describe('executiveSummary', () => {
  const subject = 'a hot dog'

  it('reports unanimity plainly', () => {
    const text = executiveSummary({
      subject,
      results: [result('A', ['no']), result('B', ['no'])],
    })
    expect(text).toContain('unanimous')
    expect(text).toContain('negative')
    expect(text).toContain('a hot dog')
  })

  it('names dissenters when there is a majority', () => {
    const text = executiveSummary({
      subject,
      results: [result('A', ['no']), result('B', ['no']), result('C', ['yes'])],
    })
    expect(text).toContain('majority support')
    expect(text).toContain('C')
  })

  it('says the field is divided on a tie', () => {
    const text = executiveSummary({
      subject,
      results: [result('A', ['yes']), result('B', ['no'])],
    })
    expect(text).toContain('divided')
  })

  it('handles every model having failed', () => {
    const text = executiveSummary({ subject, results: [errored('A'), errored('B')] })
    expect(text).toContain('No model returned a usable response')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('NaN')
  })

  it('mentions unavailable providers rather than hiding them', () => {
    const text = executiveSummary({
      subject,
      results: [result('A', ['no']), errored('Down')],
    })
    expect(text).toContain('Down')
    expect(text).toContain('unavailable')
  })

  it('never emits undefined, NaN or an empty list for any shape of run', () => {
    const shapes: ModelResult[][] = [
      [],
      [result('A', ['yes'])],
      [errored('A')],
      [result('A', ['other'], { followed: false })],
      [result('A', ['yes']), result('B', ['no']), result('C', ['other'])],
      [result('A', ['yes']), errored('B'), errored('C')],
    ]
    for (const results of shapes) {
      const text = executiveSummary({ subject, results })
      expect(text).not.toMatch(/undefined|NaN|Infinity/)
      expect(text.length).toBeGreaterThan(20)
      expect(text.trim()).toBe(text)
    }
  })

  it('reads as analyst prose, never acknowledging the subject is silly', () => {
    const text = executiveSummary({
      subject,
      results: [result('A', ['no']), result('B', ['yes'])],
    })
    expect(text).not.toMatch(/funny|joke|silly|obviously|lol/i)
  })
})

describe('keyFindings', () => {
  const subject = 'a hot dog'
  const field = [
    result('Fast', ['no'], { totalMs: 200 }),
    result('Slow', ['no'], { totalMs: 4000 }),
    result('Odd', ['other'], { followed: false, outputTokens: 40 }),
  ]

  it('produces between one and six findings', () => {
    const findings = keyFindings({ subject, results: field })
    expect(findings.length).toBeGreaterThanOrEqual(1)
    expect(findings.length).toBeLessThanOrEqual(6)
  })

  it('leads with consensus', () => {
    expect(keyFindings({ subject, results: field })[0]?.label).toMatch(/[Cc]onsensus/)
  })

  it('handles a unanimous run', () => {
    const findings = keyFindings({ subject, results: [result('A', ['no']), result('B', ['no'])] })
    expect(findings.some((f) => f.text.includes('unanimous'))).toBe(true)
  })

  it('handles a split run', () => {
    const findings = keyFindings({
      subject,
      results: [result('A', ['yes']), result('B', ['no'])],
    })
    expect(findings.some((f) => f.label === 'No consensus')).toBe(true)
  })

  it('handles a single-model run', () => {
    const findings = keyFindings({ subject, results: [result('Only', ['yes'])] })
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => !/undefined|NaN/.test(f.text))).toBe(true)
  })

  it('handles an all-error run without inventing findings', () => {
    const findings = keyFindings({ subject, results: [errored('A'), errored('B')] })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.text).toContain('No provider returned a usable response')
  })

  it('reports latency spread with a real multiple', () => {
    const finding = keyFindings({ subject, results: field }).find(
      (f) => f.label === 'Response latency',
    )
    expect(finding?.text).toMatch(/\d+(\.\d+)?×/)
  })

  it('never emits undefined or NaN for any shape', () => {
    const shapes: ModelResult[][] = [
      [],
      [result('A', ['yes'])],
      [errored('A')],
      field,
      [...field, errored('Down')],
    ]
    for (const results of shapes) {
      for (const finding of keyFindings({ subject, results })) {
        expect(finding.text).not.toMatch(/undefined|NaN|Infinity/)
        expect(finding.label.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('complianceRate', () => {
  it('averages the per-model rates', () => {
    expect(complianceRate([result('A', ['yes']), result('B', ['yes'], { followed: false })])).toBe(
      0.5,
    )
  })

  it('returns null when nothing reported a rate', () => {
    expect(complianceRate([errored('A')])).toBeNull()
  })
})

describe('vendorVerdictLine', () => {
  it('describes an unavailable model without pretending to assess it', () => {
    expect(vendorVerdictLine(errored('A'), [errored('A')])).toContain('Unavailable')
  })

  it('gives a decisive, fast model the strongest line', () => {
    const fast = result('Fast', ['yes', 'yes', 'yes'], { totalMs: 100 })
    const slow = result('Slow', ['other'], { followed: false, totalMs: 9000 })
    expect(vendorVerdictLine(fast, [fast, slow])).toContain('promptly')
  })

  it('never emits undefined for any shape', () => {
    const field = [result('A', ['yes']), result('B', ['other'], { followed: false }), errored('C')]
    for (const entry of field) {
      expect(vendorVerdictLine(entry, field)).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('rankModels and rankWithDeltas', () => {
  it('ranks by composite score descending', () => {
    const fast = result('Fast', ['yes', 'yes', 'yes'], { totalMs: 100 })
    const slow = result('Slow', ['other'], { followed: false, totalMs: 9000 })
    const ranked = rankModels([slow, fast])
    expect(ranked.map((r) => r.result.displayName)).toEqual(['Fast', 'Slow'])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2])
  })

  it('shares a rank on a tie and skips the next, as any standings table does', () => {
    const a = result('A', ['yes'], { totalMs: 500 })
    const b = result('B', ['yes'], { totalMs: 500 })
    const c = result('C', ['other'], { followed: false, totalMs: 9000 })
    const ranked = rankModels([a, b, c])
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3])
  })

  it('breaks ties alphabetically so the page is deterministic', () => {
    const zeta = result('Zeta', ['yes'], { totalMs: 500 })
    const alpha = result('Alpha', ['yes'], { totalMs: 500 })
    expect(rankModels([zeta, alpha])[0]?.result.displayName).toBe('Alpha')
  })

  it('computes rank movement against the prior edition', () => {
    const previous = [
      result('A', ['other'], { followed: false, totalMs: 9000 }),
      result('B', ['yes'], { totalMs: 100 }),
    ]
    const current = [
      result('A', ['yes'], { totalMs: 100 }),
      result('B', ['other'], { followed: false, totalMs: 9000 }),
    ]
    const ranked = rankWithDeltas(current, previous)
    const a = ranked.find((r) => r.result.displayName === 'A')!
    const b = ranked.find((r) => r.result.displayName === 'B')!
    expect(a.movement).toBe('up')
    expect(a.delta).toBe(1)
    expect(b.movement).toBe('down')
    expect(b.delta).toBe(-1)
  })

  it('marks a model with no prior appearance as new rather than as having risen', () => {
    // There is no earlier position to have moved from.
    const ranked = rankWithDeltas([result('New', ['yes'])], [result('Old', ['yes'])])
    const entry = ranked.find((r) => r.result.displayName === 'New')!
    expect(entry.movement).toBe('new')
    expect(entry.delta).toBeNull()
  })

  it('marks everything new when there is no prior edition at all', () => {
    const ranked = rankWithDeltas([result('A', ['yes']), result('B', ['no'])], null)
    expect(ranked.every((r) => r.movement === 'new')).toBe(true)
  })

  it('reports unchanged when a model holds its position', () => {
    const field = [result('A', ['yes'], { totalMs: 100 }), result('B', ['no'], { totalMs: 900 })]
    const ranked = rankWithDeltas(field, field)
    expect(ranked.every((r) => r.movement === 'unchanged' && r.delta === 0)).toBe(true)
  })

  it('handles an empty field', () => {
    expect(rankModels([])).toEqual([])
    expect(rankWithDeltas([], null)).toEqual([])
  })

  it('labels every movement in words, so no meaning rests on a glyph', () => {
    for (const movement of ['up', 'down', 'unchanged', 'new', 'returning'] as const) {
      expect(MOVEMENT_LABEL[movement].length, movement).toBeGreaterThan(0)
    }
  })

  it('gives new and returning entries no glyph at all', () => {
    // They have not moved, so an arrow would be wrong, and a star or similar
    // flourish is out of register for this report — the build-output emoji
    // check caught exactly that when it was tried.
    expect(MOVEMENT_GLYPH.new).toBe('')
    expect(MOVEMENT_GLYPH.returning).toBe('')
    expect(MOVEMENT_GLYPH.up).not.toBe('')
    expect(MOVEMENT_GLYPH.down).not.toBe('')
  })
})
