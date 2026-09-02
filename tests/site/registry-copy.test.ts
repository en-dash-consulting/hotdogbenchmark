import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConditions, loadQuestions } from '../../src/data/registries.ts'
import { framingLabel } from '../../src/site/lib/prose.ts'

/**
 * The site's copy is driven by the registries, not by the hot dog.
 *
 * Two checks. The cheap one: with the shipped `questions.json` the answer
 * board still says "Tell them a hot dog is a sandwich". The expensive one: a
 * copy of the repository whose registries ask "Is a burrito a wrap?" builds a
 * site that never mentions a sandwich. The build runs once for the file, in a
 * temporary directory with its own output, so it neither touches `dist/` nor
 * races the other build test for it.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

describe('the shipped registries', () => {
  it('label the answer board "Tell them a hot dog is a sandwich"', () => {
    const [hotDog] = loadQuestions()
    const [control, asserted, denied] = loadConditions()
    expect(framingLabel(hotDog!, control!)).toBe('Just ask')
    expect(framingLabel(hotDog!, asserted!)).toBe('Tell them a hot dog is a sandwich')
    expect(framingLabel(hotDog!, denied!)).toBe('Tell them a hot dog is not a sandwich')
  })
})

/** The fork's registries: one question, not about sandwiches. */
const QUESTIONS = {
  questions: [
    {
      id: 'burrito',
      subject: 'a burrito',
      claim: 'is a wrap',
      denial: 'is not a wrap',
      text: 'Is a burrito a wrap? One word answer.',
      reportTitle: 'The Burrito Question',
      tagline: 'Folded, not stacked. The tortilla has opinions.',
      enabled: true,
    },
  ],
}

const CONDITIONS = {
  conditions: [
    {
      id: 'control',
      label: 'Control',
      description: 'The question exactly as written, with no system prompt.',
      systemPrompt: null,
      promptPrefix: null,
      promptSuffix: null,
      temperature: null,
      enabled: true,
    },
    {
      id: 'asserted',
      label: 'Asserted',
      description: 'A system prompt states the affirmative answer as fact.',
      systemPrompt: '{subject} is a wrap.',
      promptPrefix: null,
      promptSuffix: null,
      temperature: null,
      enabled: true,
    },
    {
      id: 'denied',
      label: 'Denied',
      description: 'A system prompt states the negative answer as fact.',
      systemPrompt: '{subject} is not a wrap.',
      promptPrefix: null,
      promptSuffix: null,
      temperature: null,
      enabled: true,
    },
  ],
}

/** The fork's own name, publisher and repository: none of the upstream's. */
const SITE = {
  name: 'Burrito Benchmark',
  wordmark: ['Burrito', 'Benchmark'],
  shortName: 'Burrito',
  byline: 'a Taqueria Labs research program',
  publisher: { name: 'Taqueria Labs', url: 'https://taqueria.example' },
  repository: 'https://github.com/taqueria-labs/burritobenchmark',
  mark: { src: 'brand/mark.svg', alt: 'Taqueria Labs' },
  footerNote: 'A Taqueria Labs research program of no consequence whatsoever.',
  credits: [],
  more: null,
  contact: null,
}

/** What the upstream calls itself: none of it may appear in the fork. */
const UPSTREAM_BRAND = [
  /hotdog/i,
  /hot dog/i,
  /en dash/i,
  /endash\.us/i,
  /en-dash-consulting/i,
  /n-dx\.dev/i,
  /learn-langgraph/i,
]

/**
 * A minimal, schema-valid edition for the burrito: one model, one sample per
 * cell, three cells. Written by hand because the recorded mock fixtures only
 * know the shipped questions. The model is a real entry from `models.json`
 * so every page that looks a model up finds one.
 */
function editionFor(model: { provider: string; modelId: string; displayName: string }) {
  const question = QUESTIONS.questions[0]!
  const cell = (
    conditionId: string,
    systemPrompt: string | null,
    text: string,
    verdict: string,
  ) => ({
    questionId: question.id,
    conditionId,
    prompt: question.text,
    systemPrompt,
    models: [
      {
        provider: model.provider,
        modelId: model.modelId,
        displayName: model.displayName,
        reasoningEffort: null,
        status: 'ok',
        samples: [
          {
            text,
            verdict,
            followedInstruction: true,
            usage: {
              inputTokens: 14,
              outputTokens: 1,
              totalTokens: 15,
              reasoningTokens: null,
              cachedInputTokens: null,
            },
            timing: { startedAt: '2026-09-01T12:00:00.000Z', ttfbMs: 300, totalMs: 900 },
            costEstimateUsd: 0.0001,
            raw: {},
          },
        ],
        aggregate: {
          sampleCount: 1,
          totalMs: { median: 900, min: 900, max: 900 },
          ttfbMs: { median: 300, min: 300, max: 300 },
          inputTokens: { median: 14, min: 14, max: 14 },
          outputTokens: { median: 1, min: 1, max: 1 },
          totalTokens: { median: 15, min: 15, max: 15 },
          tokensPerSecond: { median: 1.1, min: 1.1, max: 1.1 },
          verdict,
          followedInstructionRate: 1,
          costEstimateUsd: 0.0001,
        },
        error: null,
      },
    ],
  })
  return {
    schemaVersion: 2,
    runId: 'burrito-0000-0000-0000',
    isoWeek: '2026-W36',
    startedAt: '2026-09-01T12:00:00.000Z',
    finishedAt: '2026-09-01T12:04:00.000Z',
    runnerVersion: '0.1.0',
    gitSha: null,
    isMock: false,
    questions: [{ id: question.id, text: question.text }],
    conditions: CONDITIONS.conditions.map(({ enabled: _enabled, ...condition }) => condition),
    results: [
      cell('control', null, 'No', 'no'),
      cell('asserted', 'A burrito is a wrap.', 'Yes', 'yes'),
      cell('denied', 'A burrito is not a wrap.', 'No', 'no'),
    ],
  }
}

describe('a fork that asks whether a burrito is a wrap', () => {
  let root: string
  let pages: Array<{ path: string; html: string }> = []
  let dist: string

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      if (name === '.prerender') return []
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : []
    })

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'hdb-fork-'))
    dist = join(root, 'dist')
    for (const entry of [
      'src',
      'public',
      'scripts',
      'models.json',
      'package.json',
      'astro.config.mjs',
      'tsconfig.json',
    ]) {
      cpSync(join(ROOT, entry), join(root, entry), {
        recursive: true,
        // Build output and Astro's type cache may exist under src/site; neither belongs in the copy.
        filter: (source) => !['dist', '.astro'].includes(basename(source)),
      })
    }
    // A fork lives on its own domain, or on none: the upstream's CNAME is not its canonical host.
    rmSync(join(root, 'public/CNAME'), { force: true })
    mkdirSync(join(root, 'data/runs'), { recursive: true })
    // Symlinked rather than copied: the build needs astro and zod, and a copy
    // of node_modules per test would dominate the run time.
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')

    const models = JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
      models: Array<{ provider: string; modelId: string; displayName: string; enabled: boolean }>
    }
    const model = models.models.find((m) => m.enabled)!

    writeFileSync(join(root, 'questions.json'), JSON.stringify(QUESTIONS, null, 2))
    writeFileSync(join(root, 'conditions.json'), JSON.stringify(CONDITIONS, null, 2))
    writeFileSync(join(root, 'site.json'), JSON.stringify(SITE, null, 2))
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(editionFor(model), null, 2))

    execFileSync(join(root, 'node_modules/.bin/astro'), ['build'], {
      cwd: root,
      env: { ...process.env, ASTRO_OUT_DIR: dist },
      stdio: 'ignore',
    })

    pages = walk(dist).map((file) => ({
      path: file.slice(dist.length) || '/',
      html: readFileSync(file, 'utf8'),
    }))
  }, 180_000)

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it('builds', () => {
    expect(pages.length).toBeGreaterThan(0)
    expect(pages.map((p) => p.path)).toContain('/index.html')
  })

  it('labels the answer board from the burrito question', () => {
    const home = pages.find((p) => p.path === '/index.html')!.html
    expect(home).toContain('Tell them a burrito is a wrap')
    expect(home).toContain('Tell them a burrito is not a wrap')
    expect(home).toContain('Is a burrito a wrap?')
  })

  it('describes the topic from the registry on the About and Methodology pages', () => {
    const about = pages.find((p) => p.path === '/about/index.html')!.html
    expect(about).toContain('whether a burrito is a wrap')
    expect(about).toContain('told it is a wrap, told it is not a wrap')
    expect(about).toContain('drop the burrito')

    const methodology = pages.find((p) => p.path === '/methodology/index.html')!.html
    expect(methodology).toContain('Whether a burrito is a wrap is not a matter of fact')
    expect(methodology).toContain('A burrito is a wrap')
  })

  it('never mentions a sandwich anywhere in the built HTML', () => {
    // Every page, including the report and run pages: with burrito data there
    // is no raw prompt or system prompt that could legitimately say it.
    //
    for (const page of pages) {
      const html = page.html
      const hit = /sandwich/i.exec(html)
      const context = hit ? html.slice(Math.max(0, hit.index - 80), hit.index + 80) : ''
      expect(hit, `${page.path} mentions a sandwich: …${context}…`).toBeNull()
    }
  })

  it("carries the fork's own name, publisher and repository, and none of the upstream's", () => {
    const home = pages.find((p) => p.path === '/index.html')!.html
    expect(home).toContain('BURRITO BENCHMARK')
    expect(home).toContain('https://github.com/taqueria-labs/burritobenchmark')
    expect(home).toContain('Taqueria Labs')
    const report = pages.find((p) => p.path === '/reports/burrito/index.html')!.html
    expect(report).toContain('Burrito Benchmark, a Taqueria Labs research program')

    const texts = [
      ...pages.map((p) => ({ name: p.path, text: p.html })),
      ...['feed.json', 'feed.xml', 'llms.txt', 'llms-full.txt', 'manifest.webmanifest'].map(
        (file) => ({ name: file, text: readFileSync(join(dist, file), 'utf8') }),
      ),
    ]
    for (const { name, text } of texts) {
      for (const pattern of UPSTREAM_BRAND) {
        const hit = pattern.exec(text)
        const context = hit ? text.slice(Math.max(0, hit.index - 60), hit.index + 60) : ''
        expect(hit, `${name} carries the upstream brand ${pattern}: …${context}…`).toBeNull()
      }
    }
  })

  it('describes the feeds from the registry', () => {
    for (const feed of ['feed.json', 'feed.xml']) {
      const text = readFileSync(join(dist, feed), 'utf8')
      expect(text, feed).toContain('whether a burrito is a wrap')
      expect(text, feed).not.toMatch(/sandwich/i)
    }
  })
})
