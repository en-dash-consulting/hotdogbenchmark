/**
 * Writes a clearly-labelled sample run into data/runs so the site has something
 * to render before the first real benchmark has been collected.
 *
 * The output is marked `isMock: true`, which the site renders with a visible
 * "sample data" notice. It is a placeholder, not a measurement: the answers are
 * plausible rather than observed, and the timings are made up.
 *
 * Once mock mode lands, `npm run bench -- run --mock` replaces this by replaying
 * real recorded fixtures, and this script can go away.
 *
 * Usage: node scripts/make-sample-run.mjs [isoWeek]
 */
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))

const questions = read('questions.json').questions.filter((q) => q.enabled)
const models = read('models.json').models.filter((m) => m.enabled)

/** Plausible placeholder answers, keyed by question then provider. */
const ANSWERS = {
  'hot-dog': {
    anthropic: 'No',
    openai: 'No',
    gemini: 'Yes',
    xai: 'Yes',
    mistral: 'No',
    deepseek: 'Technically, yes.',
    'llama-hosted': 'No',
  },
  hamburger: {
    anthropic: 'Yes',
    openai: 'Yes',
    gemini: 'Yes',
    xai: 'Yes',
    mistral: 'Yes',
    deepseek: 'Yes',
    'llama-hosted': 'Yes',
  },
  taco: {
    anthropic: 'No',
    openai: 'No',
    gemini: 'No',
    xai: 'Depends.',
    mistral: 'No',
    deepseek: 'No',
    'llama-hosted': 'No',
  },
}

/** Rough per-provider latency character, so the charts have something to show. */
const LATENCY = {
  anthropic: 890,
  openai: 1240,
  gemini: 520,
  xai: 1010,
  mistral: 660,
  deepseek: 1480,
  'llama-hosted': 340,
}

// Deterministic pseudo-randomness: the same week always produces the same file,
// so regenerating it never shows a spurious diff.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoWeekFor(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayOfWeek = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayOfWeek)
  const isoYear = target.getUTCFullYear()
  const days = (target.getTime() - Date.UTC(isoYear, 0, 1)) / 86400000
  return `${isoYear}-W${String(Math.ceil((days + 1) / 7)).padStart(2, '0')}`
}

const stat = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return {
    median: sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

const normalize = (text) =>
  text
    .trim()
    .replace(/^["'`]+|["'`.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()

const verdictOf = (text) => {
  const n = normalize(text)
  if (n === 'yes') return 'yes'
  if (n === 'no') return 'no'
  return 'other'
}

const SAMPLES = 3
const isoWeek = process.argv[2] ?? isoWeekFor(new Date())
const startMs = Date.UTC(2026, 8, 1, 12, 0, 0)
const random = mulberry32([...isoWeek].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7))

const results = questions.map((question, qi) => ({
  questionId: question.id,
  models: models.map((model) => {
    const text = ANSWERS[question.id]?.[model.provider] ?? 'Yes'
    const base = LATENCY[model.provider] ?? 900
    const inputTokens = 13 + question.text.length / 8

    const samples = Array.from({ length: SAMPLES }, (_, s) => {
      const totalMs = Math.round(base * (0.85 + random() * 0.3))
      const outputTokens = Math.max(1, Math.round(normalize(text).split(' ').length * 1.5))
      const input = Math.round(inputTokens)
      const priceIn = model.pricing.inputUsdPerMTok ?? 0
      const priceOut = model.pricing.outputUsdPerMTok ?? 0
      return {
        text,
        verdict: verdictOf(text),
        followedInstruction: normalize(text).split(' ').length === 1,
        usage: {
          inputTokens: input,
          outputTokens,
          totalTokens: input + outputTokens,
          reasoningTokens: null,
          cachedInputTokens: null,
        },
        timing: {
          startedAt: new Date(startMs + qi * 90_000 + s * 2_000).toISOString(),
          ttfbMs: model.supportsStreaming ? Math.round(totalMs * (0.35 + random() * 0.2)) : null,
          totalMs,
        },
        costEstimateUsd: Number(
          ((input * priceIn) / 1e6 + (outputTokens * priceOut) / 1e6).toFixed(6),
        ),
        raw: { note: 'placeholder sample data, not a recorded provider response' },
      }
    })

    const totals = samples.map((s) => s.timing.totalMs)
    const ttfbs = samples.map((s) => s.timing.ttfbMs).filter((v) => v !== null)
    return {
      provider: model.provider,
      modelId: model.modelId,
      displayName: model.displayName,
      status: 'ok',
      samples,
      aggregate: {
        sampleCount: samples.length,
        totalMs: stat(totals),
        ttfbMs: ttfbs.length ? stat(ttfbs) : null,
        inputTokens: stat(samples.map((s) => s.usage.inputTokens)),
        outputTokens: stat(samples.map((s) => s.usage.outputTokens)),
        totalTokens: stat(samples.map((s) => s.usage.totalTokens)),
        tokensPerSecond: stat(
          samples.map((s) => Number((s.usage.outputTokens / (s.timing.totalMs / 1000)).toFixed(4))),
        ),
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
  runId: `sample-${isoWeek}`,
  isoWeek,
  startedAt: new Date(startMs).toISOString(),
  finishedAt: new Date(startMs + 5 * 60_000).toISOString(),
  runnerVersion: read('package.json').version,
  gitSha: null,
  isMock: true,
  questions: questions.map((q) => ({ id: q.id, text: q.text })),
  results,
}

const out = new URL(`data/runs/${isoWeek}.json`, root)
writeFileSync(out, JSON.stringify(run, null, 2) + '\n')
console.log(
  `wrote data/runs/${isoWeek}.json (${questions.length} questions, ${models.length} models)`,
)
