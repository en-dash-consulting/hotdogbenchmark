import { describe, expect, it } from 'vitest'
import { MIGRATED_CONTROL_CONDITION } from '../../src/data/migrate.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderRun } from '../../src/site/run/render.ts'
import type { BenchmarkRun } from '../../src/schema/run.ts'

/**
 * The bring-your-own-keys page, checked at the source level.
 *
 * The behaviors that matter here are security properties — where keys are
 * stored, what is sent where — so they are asserted against the code that
 * implements them rather than only against rendered output.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('key storage', () => {
  const source = read('src/site/run/keys.ts')
  /** Comments explain the rule; only the code has to obey it. */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('uses sessionStorage and never localStorage or a cookie', () => {
    // sessionStorage is the shortest lifetime available without retyping a key
    // per request. localStorage survives the tab; a cookie is sent everywhere.
    expect(code).toContain('window.sessionStorage')
    expect(code).not.toMatch(/localStorage/)
    expect(code).not.toMatch(/document\.cookie/)
  })

  it('namespaces keys so clearing cannot miss one', () => {
    expect(source).toMatch(/const PREFIX/)
  })

  it('guards every storage access, since sessionStorage throws in privacy modes', () => {
    expect(source).toMatch(/try\s*\{[\s\S]*sessionStorage/)
  })
})

describe('the proxy fetch', () => {
  const source = read('src/site/run/proxy-fetch.ts')

  it('sends every provider call to the proxy origin, never to a provider directly', () => {
    expect(source).toContain('/v1/forward')
    // The upstream URL is a field in the body, not the request target.
    expect(source).toMatch(/url,/)
  })

  it('includes credentials so the session cookie rides along', () => {
    expect(source).toContain("credentials: 'include'")
  })

  it('sends the CSRF token', () => {
    expect(source).toContain('x-csrf-token')
  })
})

describe('the run app', () => {
  const source = read('src/site/run/app.ts')

  it('clears keys locally before the sign-out request, not after', () => {
    // A failed sign-out request must not leave keys sitting in storage.
    const clearIndex = source.indexOf('clearKeys()')
    const logoutIndex = source.indexOf('/auth/logout')
    expect(clearIndex).toBeGreaterThan(-1)
    expect(clearIndex).toBeLessThan(logoutIndex)
  })

  it('disables models whose provider has no key', () => {
    expect(source).toMatch(/no \$\{model\.provider\} key set|no .* key set/)
    expect(source).toContain('disabled')
  })

  it('shows a live preview of the exact prompt that will be sent', () => {
    expect(source).toContain('promptPreview')
    expect(source).toContain('ONE_WORD_SUFFIX')
  })

  it('announces progress through a live region', () => {
    expect(source).toContain('announce(')
  })

  it('uses the same runner and adapters as the CLI', () => {
    expect(source).toContain("from '../../runner/run.ts'")
    expect(source).toContain("from '../../providers/anthropic.ts'")
  })

  it('never uploads a run — download only', () => {
    expect(source).toContain('URL.createObjectURL')
    expect(source).not.toMatch(/fetch\([^)]*data\//)
  })
})

describe('renderRun', () => {
  function run(text: string, verdict: 'yes' | 'no' | 'other' = 'no'): BenchmarkRun {
    return {
      schemaVersion: 2,
      runId: 'browser-1',
      isoWeek: '2026-W36',
      startedAt: '2026-09-01T12:00:00.000Z',
      finishedAt: '2026-09-01T12:01:00.000Z',
      runnerVersion: 'browser',
      gitSha: null,
      isMock: false,
      questions: [{ id: 'custom', text: 'Is a burrito a sandwich? One word answer.' }],
      conditions: [MIGRATED_CONTROL_CONDITION],
      results: [
        {
          questionId: 'custom',
          conditionId: 'control',
          prompt: 'Is a burrito a sandwich? One word answer.',
          systemPrompt: null,
          models: [
            {
              provider: 'anthropic',
              modelId: 'claude-opus-5',
              displayName: 'Claude Opus 5',
              reasoningEffort: null,
              status: 'ok',
              samples: [
                {
                  text,
                  verdict,
                  followedInstruction: true,
                  usage: {
                    inputTokens: 15,
                    outputTokens: 1,
                    totalTokens: 16,
                    reasoningTokens: null,
                    cachedInputTokens: null,
                  },
                  timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: 200, totalMs: 800 },
                  costEstimateUsd: 0.0001,
                },
              ],
              aggregate: {
                sampleCount: 1,
                totalMs: { median: 800, min: 800, max: 800 },
                ttfbMs: { median: 200, min: 200, max: 200 },
                inputTokens: { median: 15, min: 15, max: 15 },
                outputTokens: { median: 1, min: 1, max: 1 },
                totalTokens: { median: 16, min: 16, max: 16 },
                tokensPerSecond: { median: 1.25, min: 1.25, max: 1.25 },
                verdict,
                followedInstructionRate: 1,
                costEstimateUsd: 0.0001,
              },
              error: null,
            },
          ],
        },
      ],
    }
  }

  it('always shows the unofficial banner', () => {
    expect(renderRun(run('No'), 'a burrito')).toContain('Unofficial run')
  })

  it('states that the run is not published', () => {
    // Collapse whitespace: the template wraps mid-sentence.
    const html = renderRun(run('No'), 'a burrito').replace(/\s+/g, ' ')
    expect(html).toMatch(/not published/i)
    expect(html).toMatch(/not part of the archive/i)
  })

  it('escapes model output, which is untrusted input', () => {
    // A model that returns markup must not be able to inject it into the page.
    // The test is that no *tag* survives — the literal text "onerror=" inside an
    // escaped string is inert, because the angle brackets around it are gone.
    const html = renderRun(run('<img src=x onerror="alert(1)">', 'other'), 'a burrito')
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<script/i)
    expect(html).toContain('&lt;img')
    expect(html).toContain('&quot;')
  })

  it('offers download and clear controls', () => {
    const html = renderRun(run('No'), 'a burrito')
    expect(html).toContain('id="download-run"')
    expect(html).toContain('id="clear-results"')
  })

  it('marks every entry as new, since an unofficial run has no prior edition', () => {
    expect(renderRun(run('No'), 'a burrito')).toContain('no prior edition')
  })
})

describe('the JavaScript budget script', () => {
  const source = read('scripts/js-budget.mjs')

  it('excludes scripts referenced only by the run page', () => {
    expect(source).toContain('onlyForRunPage')
  })

  it('reports orphaned bundles separately rather than counting them', () => {
    // Astro emits a page component's script even when the page is not
    // generated. Nothing links it, so no user downloads it — but it is still
    // dead weight worth surfacing.
    expect(source).toContain('unreferenced')
    expect(source).toContain('Orphaned')
  })
})
