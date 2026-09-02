import { describe, expect, it } from 'vitest'
import {
  SENSITIVITY_DEFINITION,
  editionSensitivity,
  fieldSensitivity,
  framingSensitivity,
  hasConditions,
  modelsInRun,
  questionShifts,
  treatedConditions,
  verdictShift,
} from '../../src/site/lib/sensitivity.ts'
import type { BenchmarkRun, ModelResult, RunCondition, Verdict } from '../../src/schema/run.ts'

function model(name: string, verdict: Verdict | null): ModelResult {
  const ok = verdict !== null
  return {
    provider: name.toLowerCase(),
    modelId: `${name.toLowerCase()}-1`,
    displayName: name,
    status: ok ? 'ok' : 'error',
    samples: ok
      ? [
          {
            text: verdict === 'yes' ? 'Yes' : verdict === 'no' ? 'No' : 'Arguably.',
            verdict,
            followedInstruction: true,
            usage: {
              inputTokens: 15,
              outputTokens: 1,
              totalTokens: 16,
              reasoningTokens: null,
              cachedInputTokens: null,
            },
            timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: 300, totalMs: 900 },
            costEstimateUsd: 0.0001,
          },
        ]
      : [],
    aggregate: {
      sampleCount: ok ? 1 : 0,
      totalMs: ok ? { median: 900, min: 900, max: 900 } : null,
      ttfbMs: ok ? { median: 300, min: 300, max: 300 } : null,
      inputTokens: ok ? { median: 15, min: 15, max: 15 } : null,
      outputTokens: ok ? { median: 1, min: 1, max: 1 } : null,
      totalTokens: ok ? { median: 16, min: 16, max: 16 } : null,
      tokensPerSecond: ok ? { median: 1.1, min: 1.1, max: 1.1 } : null,
      verdict,
      followedInstructionRate: ok ? 1 : null,
      costEstimateUsd: ok ? 0.0001 : null,
    },
    error: ok
      ? null
      : { category: 'server', message: 'down', retryable: true, providerStatus: 503 },
  }
}

const CONTROL: RunCondition = {
  id: 'control',
  label: 'Control',
  description: 'Plain.',
  systemPrompt: null,
  promptPrefix: null,
  promptSuffix: null,
  temperature: null,
}
const ASSERTED: RunCondition = {
  ...CONTROL,
  id: 'asserted',
  label: 'Asserted',
  description: 'Told yes.',
  systemPrompt: '{subject} is a sandwich.',
}
const DENIED: RunCondition = {
  ...CONTROL,
  id: 'denied',
  label: 'Denied',
  description: 'Told no.',
  systemPrompt: '{subject} is not a sandwich.',
}

/**
 * Build a run from a table: question id → condition id → model verdicts.
 * A null verdict means the model errored in that cell.
 */
function run(
  table: Record<string, Record<string, Record<string, Verdict | null>>>,
  conditions: RunCondition[] = [CONTROL, ASSERTED],
): BenchmarkRun {
  const questionIds = Object.keys(table)
  return {
    schemaVersion: 2,
    runId: 'r',
    isoWeek: '2026-W36',
    startedAt: '2026-09-01T12:00:00.000Z',
    finishedAt: '2026-09-01T12:05:00.000Z',
    runnerVersion: '0.1.0',
    gitSha: null,
    isMock: false,
    questions: questionIds.map((id) => ({ id, text: `Is a ${id} a sandwich? One word answer.` })),
    conditions,
    results: conditions.flatMap((condition) =>
      questionIds.map((questionId) => ({
        questionId,
        conditionId: condition.id,
        prompt: `Is a ${questionId} a sandwich? One word answer.`,
        systemPrompt: condition.systemPrompt,
        models: Object.entries(table[questionId]![condition.id] ?? {}).map(([name, verdict]) =>
          model(name, verdict),
        ),
      })),
    ),
  }
}

describe('verdictShift', () => {
  it('reports a held position when the verdict is the same under both arms', () => {
    expect(verdictShift(model('A', 'no'), model('A', 'no'))).toEqual({
      from: 'no',
      to: 'no',
      status: 'held',
    })
  })

  it('reports a move when the verdict differs', () => {
    expect(verdictShift(model('A', 'no'), model('A', 'yes'))).toEqual({
      from: 'no',
      to: 'yes',
      status: 'moved',
    })
  })

  it('is incomparable when either arm produced no verdict', () => {
    // An outage in one arm is not a change of position.
    expect(verdictShift(model('A', 'no'), model('A', null)).status).toBe('incomparable')
    expect(verdictShift(model('A', null), model('A', 'yes')).status).toBe('incomparable')
    expect(verdictShift(null, model('A', 'yes')).status).toBe('incomparable')
  })
})

describe('framingSensitivity', () => {
  const pair = (from: Verdict | null, to: Verdict | null) => ({
    control: model('A', from),
    treated: model('A', to),
  })

  it('scores 0 for a model that never moves', () => {
    expect(framingSensitivity([pair('no', 'no'), pair('yes', 'yes'), pair('no', 'no')])).toEqual({
      comparable: 3,
      moved: 0,
      score: 0,
    })
  })

  it('scores 1 for full adoption of the framing', () => {
    expect(framingSensitivity([pair('no', 'yes'), pair('no', 'yes'), pair('no', 'yes')])).toEqual({
      comparable: 3,
      moved: 3,
      score: 1,
    })
  })

  it('scores the share for partial movement', () => {
    expect(framingSensitivity([pair('no', 'yes'), pair('no', 'no'), pair('yes', 'yes')])).toEqual({
      comparable: 3,
      moved: 1,
      score: 0.3333,
    })
  })

  it('excludes a question where the model errored in one arm but not the other', () => {
    // Two comparable questions, one moved: 0.5, not 0.33 and not 0.67.
    expect(framingSensitivity([pair('no', 'yes'), pair('no', null), pair('yes', 'yes')])).toEqual({
      comparable: 2,
      moved: 1,
      score: 0.5,
    })
  })

  it('counts a move to non-committal as a move, since the position changed', () => {
    expect(framingSensitivity([pair('no', 'other')]).moved).toBe(1)
  })

  it('has no score at all when nothing is comparable', () => {
    expect(framingSensitivity([pair('no', null), pair(null, 'yes')])).toEqual({
      comparable: 0,
      moved: 0,
      score: null,
    })
  })
})

describe('questionShifts', () => {
  const edition = run({
    'hot-dog': {
      control: { A: 'no', B: 'no', C: 'yes' },
      asserted: { A: 'yes', B: 'no', C: null },
    },
  })

  it('lists every model with its control verdict and a shift per arm', () => {
    const rows = questionShifts(edition, 'hot-dog')
    expect(rows.map((row) => row.model.displayName)).toEqual(['A', 'B', 'C'])
    expect(rows[0]?.cells[0]?.shift).toEqual({ from: 'no', to: 'yes', status: 'moved' })
    expect(rows[1]?.cells[0]?.shift.status).toBe('held')
    expect(rows[2]?.cells[0]?.shift.status).toBe('incomparable')
  })

  it('flags the models that moved under any arm', () => {
    const rows = questionShifts(edition, 'hot-dog')
    expect(rows.filter((row) => row.movedAnywhere).map((row) => row.model.displayName)).toEqual([
      'A',
    ])
  })

  it('gives every row one cell per non-control condition', () => {
    const three = run(
      {
        taco: {
          control: { A: 'no' },
          asserted: { A: 'yes' },
          denied: { A: 'no' },
        },
      },
      [CONTROL, ASSERTED, DENIED],
    )
    const [row] = questionShifts(three, 'taco')
    expect(row?.cells.map((cell) => cell.condition.id)).toEqual(['asserted', 'denied'])
  })
})

describe('editionSensitivity', () => {
  it('pools the measure across every question, per arm and overall', () => {
    const edition = run(
      {
        'hot-dog': {
          control: { A: 'no' },
          asserted: { A: 'yes' },
          denied: { A: 'no' },
        },
        taco: {
          control: { A: 'no' },
          asserted: { A: 'no' },
          denied: { A: 'no' },
        },
      },
      [CONTROL, ASSERTED, DENIED],
    )
    const [entry] = editionSensitivity(edition)
    expect(entry?.byCondition.map((c) => [c.condition.id, c.score.score])).toEqual([
      ['asserted', 0.5],
      ['denied', 0],
    ])
    expect(entry?.overall).toEqual({ comparable: 4, moved: 1, score: 0.25 })
  })
})

describe('fieldSensitivity', () => {
  it('counts models that changed at least one answer against those that held every one', () => {
    const edition = run({
      'hot-dog': {
        control: { A: 'no', B: 'no', C: null },
        asserted: { A: 'yes', B: 'no', C: 'yes' },
      },
    })
    // C is never comparable, so it is in neither count.
    expect(fieldSensitivity(edition)).toEqual({ comparable: 2, moved: 1, held: 1 })
  })
})

describe('run-shape helpers', () => {
  it('knows whether an edition has anything to compare', () => {
    expect(hasConditions(run({ x: { control: { A: 'no' } } }, [CONTROL]))).toBe(false)
    expect(hasConditions(run({ x: { control: { A: 'no' }, asserted: { A: 'no' } } }))).toBe(true)
  })

  it('lists the treated arms without the control', () => {
    const edition = run({ x: { control: {}, asserted: {}, denied: {} } }, [
      CONTROL,
      ASSERTED,
      DENIED,
    ])
    expect(treatedConditions(edition).map((c) => c.id)).toEqual(['asserted', 'denied'])
  })

  it('lists models in first-seen order, once each', () => {
    const edition = run({
      x: { control: { B: 'no', A: 'no' }, asserted: { A: 'no', B: 'no' } },
    })
    expect(modelsInRun(edition).map((m) => m.displayName)).toEqual(['B', 'A'])
  })
})

describe('SENSITIVITY_DEFINITION', () => {
  it('states the formula and that neither end of the scale is better', () => {
    expect(SENSITIVITY_DEFINITION.formula).toMatch(/÷/)
    expect(SENSITIVITY_DEFINITION.note).toMatch(/Neither end of the scale is better/)
    expect(SENSITIVITY_DEFINITION.note).toMatch(/robust/)
    expect(SENSITIVITY_DEFINITION.note).toMatch(/compliant/)
  })
})
