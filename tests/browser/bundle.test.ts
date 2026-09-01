import { describe, expect, it, beforeAll } from 'vitest'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { benchmarkRunSchema } from '../../src/schema/run.ts'

/**
 * The enforcement mechanism for the runtime-agnostic constraint.
 *
 * Every claim elsewhere in this project that "the runner core and adapters can
 * run in a browser" is checked here, by actually doing it: bundling them for a
 * browser target with **no Node polyfills**, asserting the output references no
 * `node:` builtin and no `process.env`, then loading it in headless Chromium
 * and running a real benchmark.
 *
 * Lint rules and source scans can be worked around. This cannot: if the code
 * genuinely needs Node, the bundle fails to build or the browser throws.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

let bundle = ''

beforeAll(async () => {
  const result = await build({
    // An entry pulling in the runner plus every adapter — the whole surface a
    // browser-side feature would need.
    stdin: {
      contents: `
        export { runBenchmark } from './src/runner/run.ts'
        export { createAnthropicAdapter } from './src/providers/anthropic.ts'
        export { createOpenAiAdapter } from './src/providers/openai.ts'
        export { createGeminiAdapter } from './src/providers/gemini.ts'
        export { createXaiAdapter } from './src/providers/xai.ts'
        export { createMistralAdapter } from './src/providers/mistral.ts'
        export { createDeepSeekAdapter } from './src/providers/deepseek.ts'
        export { createLlamaHostedAdapter } from './src/providers/llama-hosted.ts'
        export { createMockAdapter } from './src/providers/mock.ts'
        export { analyzeAnswer } from './src/runner/analyze.ts'
        export { aggregateSamples } from './src/runner/aggregate.ts'
        export { estimateCost } from './src/runner/cost.ts'
      `,
      resolveDir: ROOT,
      sourcefile: 'browser-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    // IIFE with a global rather than ESM: the bundle is injected into the page
    // as a plain script tag. A dynamic import() inside page.evaluate() gets
    // rewritten by Vite into an SSR helper that does not exist in a browser.
    format: 'iife',
    globalName: 'HDB',
    // platform: 'browser' with no polyfills configured. If anything reaches for
    // a Node builtin, this build fails rather than silently shimming it.
    platform: 'browser',
    target: 'es2022',
  })

  bundle = result.outputFiles![0]!.text
}, 60_000)

describe('the runner core bundles for the browser', () => {
  it('builds with no Node polyfills', () => {
    expect(bundle.length).toBeGreaterThan(1000)
  })

  it('references no node: builtin', () => {
    expect(bundle).not.toMatch(/["']node:(fs|path|os|crypto|http|https|url|child_process)/)
    expect(bundle).not.toMatch(/require\(["']node:/)
  })

  it('reads no process.env', () => {
    expect(bundle).not.toMatch(/process\s*\.\s*env/)
  })

  it('pulls in no filesystem access', () => {
    for (const forbidden of ['readFileSync', 'writeFileSync', 'readdirSync']) {
      expect(bundle, `bundle references ${forbidden}`).not.toContain(forbidden)
    }
  })
})

describe('the bundled runner executes in a real browser', () => {
  it('completes a benchmark and returns a schema-valid run', async () => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      // about:blank: no network, no server. The run comes entirely from the
      // injected adapter.
      await page.goto('about:blank')

      await page.addScriptTag({ content: bundle })

      const run = await page.evaluate(async () => {
        const mod = (window as unknown as { HDB: Record<string, any> }).HDB
        if (!mod) throw new Error('bundle did not define its global')

        const fixtures = new Map([
          [
            'anthropic',
            {
              provider: 'anthropic',
              modelId: 'claude-opus-5',
              source: 'authored',
              recordedAt: '2026-09-01',
              responses: [
                {
                  questionId: 'hot-dog',
                  text: 'No',
                  usage: { inputTokens: 15, outputTokens: 1, totalTokens: 16 },
                  approxTotalMs: 800,
                  approxTtfbMs: 300,
                },
              ],
            },
          ],
        ])

        const adapter = mod.createMockAdapter('anthropic', { fixtures, seed: 1, speed: 0 })

        const outcome = await mod.runBenchmark({
          questions: [
            {
              id: 'hot-dog',
              subject: 'a hot dog',
              text: 'Is a hot dog a sandwich? One word answer.',
              reportTitle: 'Test',
              enabled: true,
            },
          ],
          models: [
            {
              provider: 'anthropic',
              modelId: 'claude-opus-5',
              displayName: 'Claude Opus 5',
              vendor: 'Anthropic',
              docsUrl: 'https://example.com',
              pricing: {
                inputUsdPerMTok: 5,
                outputUsdPerMTok: 25,
                pricingUrl: 'https://example.com',
                asOf: '2026-09-01',
              },
              supportsStreaming: true,
              supportsUsage: true,
              enabled: true,
            },
          ],
          credentials: { anthropic: 'browser-supplied-key' },
          getAdapter: () => adapter,
          // The browser's own fetch, which the runner never calls directly.
          fetch: window.fetch.bind(window),
          samples: 2,
          runId: 'browser-run',
          runnerVersion: '0.1.0',
          isMock: true,
        })

        return outcome.run
      })

      const parsed = benchmarkRunSchema.safeParse(run)
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)

      const model = (run as { results: Array<{ models: Array<Record<string, any>> }> }).results[0]!
        .models[0]!
      expect(model.samples).toHaveLength(2)
      expect(model.samples[0].text).toBe('No')
      expect(model.aggregate.verdict).toBe('no')
    } finally {
      await browser.close()
    }
  }, 60_000)
})
