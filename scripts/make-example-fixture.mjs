// Generates tests/fixtures/runs/example.json — the canonical "a valid run looks
// like this" file. Regenerate with `node scripts/make-example-fixture.mjs` after
// a schema change; the output is committed so tests do not depend on this script.
import { writeFileSync } from 'node:fs'

const QUESTIONS = [
  { id: 'hot-dog', text: 'Is a hot dog a sandwich? One word answer.' },
  { id: 'hamburger', text: 'Is a hamburger a sandwich? One word answer.' },
  { id: 'taco', text: 'Is a taco a sandwich? One word answer.' },
]

// provider, modelId, displayName, per-question answers, timing/token character
const MODELS = [
  ['anthropic', 'model-a', 'Model A', ['No', 'Yes', 'No'], 780, 12, true],
  ['openai', 'model-b', 'Model B', ['Yes', 'Yes', 'No'], 1120, 15, true],
  ['gemini', 'model-c', 'Model C', ['No', 'Yes', 'Technically, no.'], 640, 9, false],
  ['mistral', 'model-d', 'Model D', null, 0, 0, false], // errors on every question
]

const stat = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  return { median, min: sorted[0], max: sorted[sorted.length - 1] }
}

const verdictOf = (text) => {
  const word = text
    .trim()
    .replace(/[.!?,"']/g, '')
    .toLowerCase()
  if (word === 'yes') return 'yes'
  if (word === 'no') return 'no'
  return 'other'
}

const SAMPLES = 3
const start = Date.UTC(2026, 8, 1, 12, 0, 0)

const results = QUESTIONS.map((question, qi) => ({
  questionId: question.id,
  models: MODELS.map(([provider, modelId, displayName, answers, baseMs, outTok, streams]) => {
    if (answers === null) {
      return {
        provider,
        modelId,
        displayName,
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
        error: {
          category: 'rate_limit',
          message: 'Rate limit exceeded after 3 attempts.',
          retryable: true,
          providerStatus: 429,
        },
      }
    }
    const text = answers[qi]
    const samples = Array.from({ length: SAMPLES }, (_, s) => {
      const totalMs = baseMs + s * 45
      const inputTokens = 14 + qi
      const outputTokens = outTok + s
      return {
        text,
        verdict: verdictOf(text),
        followedInstruction:
          text
            .trim()
            .replace(/[.!?,"']/g, '')
            .split(/\s+/).length === 1,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          reasoningTokens: null,
          cachedInputTokens: provider === 'anthropic' ? 8 : null,
        },
        timing: {
          startedAt: new Date(start + qi * 60_000 + s * 1_000).toISOString(),
          ttfbMs: streams ? Math.round(totalMs * 0.42) : null,
          totalMs,
        },
        costEstimateUsd: Number((inputTokens * 3e-6 + outputTokens * 1.5e-5).toFixed(6)),
        raw: { note: 'vendor usage payload elided in fixtures' },
      }
    })
    const totals = samples.map((s) => s.timing.totalMs)
    const outs = samples.map((s) => s.usage.outputTokens)
    const ins = samples.map((s) => s.usage.inputTokens)
    return {
      provider,
      modelId,
      displayName,
      status: 'ok',
      samples,
      aggregate: {
        sampleCount: samples.length,
        totalMs: stat(totals),
        ttfbMs: streams ? stat(samples.map((s) => s.timing.ttfbMs)) : null,
        inputTokens: stat(ins),
        outputTokens: stat(outs),
        totalTokens: stat(samples.map((s) => s.usage.totalTokens)),
        tokensPerSecond: stat(samples.map((s) => s.usage.outputTokens / (s.timing.totalMs / 1000))),
        verdict: verdictOf(text),
        followedInstructionRate: samples[0].followedInstruction ? 1 : 0,
        costEstimateUsd: Number(samples.reduce((sum, s) => sum + s.costEstimateUsd, 0).toFixed(6)),
      },
      error: null,
    }
  }),
}))

const run = {
  schemaVersion: 1,
  runId: 'example-0000-0000-0000',
  isoWeek: '2026-W36',
  startedAt: new Date(start).toISOString(),
  finishedAt: new Date(start + 4 * 60_000).toISOString(),
  runnerVersion: '0.1.0',
  gitSha: null,
  isMock: true,
  questions: QUESTIONS,
  results,
}

writeFileSync(
  new URL('../tests/fixtures/runs/example.json', import.meta.url),
  JSON.stringify(run, null, 2) + '\n',
)
console.log('wrote tests/fixtures/runs/example.json')
