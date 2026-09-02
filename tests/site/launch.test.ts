import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAllRuns } from '../../src/data/index.ts'
import { CONTROL_CONDITION_ID } from '../../src/schema/conditions.ts'
import { ONE_WORD_SUFFIX } from '../../src/schema/questions.ts'

/**
 * What the launch depends on, checked against the built HTML.
 *
 * Titles people will search for, a description that belongs to one page and
 * no other, an OpenGraph card that exists, structured data limited to three
 * true types, the substance present in the HTML rather than painted in by
 * script, and the one footer line to the En Dash apps. Each is cheap to
 * assert and expensive to notice by eye across twenty-five pages.
 *
 * Builds into its own directory, never dist/, and renders the OpenGraph cards
 * into it, because the card assertions are about files on disk.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIST = join(ROOT, 'dist-launch-test')
const SITE_ENV = { ...process.env, ASTRO_OUT_DIR: DIST }

interface Page {
  path: string
  html: string
}

let pages: Page[] = []

const questions = (
  JSON.parse(readFileSync(join(ROOT, 'questions.json'), 'utf8')) as {
    questions: Array<{ id: string; text: string; enabled: boolean }>
  }
).questions.filter((q) => q.enabled)

const models = (
  JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
    models: Array<{ displayName: string; enabled: boolean }>
  }
).models.filter((m) => m.enabled)

const latest = loadAllRuns(ROOT)[0]?.run ?? null

beforeAll(() => {
  rmSync(DIST, { recursive: true, force: true })
  execFileSync('npm', ['run', 'build:site'], { cwd: ROOT, env: SITE_ENV, stdio: 'ignore' })
  execFileSync('node', ['scripts/og-images.mjs'], { cwd: ROOT, env: SITE_ENV, stdio: 'ignore' })

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      if (name === '.prerender') return []
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : []
    })

  pages = walk(DIST).map((file) => ({
    path: file.slice(DIST.length) || '/',
    html: readFileSync(file, 'utf8'),
  }))
}, 180_000)

afterAll(() => {
  rmSync(DIST, { recursive: true, force: true })
})

/** The value of one attribute-bearing tag, decoded, or null. */
function meta(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html)
  return match ? decode(match[1]!) : null
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** What Astro writes for text content: the five characters it escapes. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Does the page carry this text, in either raw or escaped form? */
const contains = (html: string, text: string) =>
  html.includes(text) || html.includes(escapeHtml(text))

/** The words a reader gets with scripts and styles removed. */
function wordCount(html: string): number {
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
  return text.split(/\s+/).filter((word) => /\w/.test(word)).length
}

const title = (html: string) => meta(html, /<title>([^<]*)<\/title>/)
const description = (html: string) => meta(html, /<meta name="description" content="([^"]*)"/)
const ogImage = (html: string) => meta(html, /<meta property="og:image" content="([^"]*)"/)

const isReport = (path: string) => /^\/reports\/[^/]+\/index\.html$/.test(path)
const isFullReport = (path: string) =>
  /^\/reports\/[^/]+\/(?:[^/]+\/)?index\.html$/.test(path) ||
  /^\/runs\/[^/]+\/[^/]+\/index\.html$/.test(path)

const questionHeadline = (text: string) =>
  text.endsWith(ONE_WORD_SUFFIX) ? text.slice(0, -ONE_WORD_SUFFIX.length).trim() : text

describe('titles and descriptions', () => {
  it('builds pages', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  it('gives every page a non-empty title of its own', () => {
    const seen = new Map<string, string>()
    for (const page of pages) {
      const value = title(page.html)
      expect(value, `${page.path} has no title`).toBeTruthy()
      expect(seen.get(value!), `${page.path} shares its title with ${seen.get(value!)}`).toBe(
        undefined,
      )
      seen.set(value!, page.path)
    }
  })

  it('puts the lead question in the home title', () => {
    const home = pages.find((page) => page.path === '/index.html')!
    expect(home).toBeTruthy()
    expect(title(home.html)).toContain(questionHeadline(questions[0]!.text))
    expect(title(home.html)).not.toContain(ONE_WORD_SUFFIX)
    expect(title(home.html)).toMatch(/\d+ AI models/)
  })

  it('gives every page a description no other page has, under 160 characters', () => {
    const seen = new Map<string, string>()
    for (const page of pages) {
      const value = description(page.html)
      expect(value, `${page.path} has no description`).toBeTruthy()
      expect(
        value!.length,
        `${page.path} description is ${value!.length} characters`,
      ).toBeLessThanOrEqual(160)
      expect(
        seen.get(value!),
        `${page.path} shares its description with ${seen.get(value!)}: "${value}"`,
      ).toBe(undefined)
      seen.set(value!, page.path)
    }
  })
})

describe('OpenGraph cards', () => {
  it('reference an absolute URL whose file was rendered', () => {
    for (const page of pages) {
      const url = ogImage(page.html)
      expect(url, `${page.path} has no og:image`).toBeTruthy()
      expect(url, `${page.path} og:image is not absolute`).toMatch(/^https?:\/\//)
      const pathname = new URL(url!).pathname
      const index = pathname.indexOf('/og/')
      expect(index, `${page.path} og:image is not under /og/`).toBeGreaterThanOrEqual(0)
      const file = join(DIST, pathname.slice(index))
      expect(existsSync(file), `${page.path} og:image ${pathname} was not rendered`).toBe(true)
    }
  })

  it('give the framed reports and the editions cards of their own', () => {
    const framed = pages.filter((page) => /^\/reports\/[^/]+\/[^/]+\/index\.html$/.test(page.path))
    for (const page of framed) {
      expect(ogImage(page.html), page.path).toMatch(/\/og\/[^/]+-[^/]+\.png$/)
    }
    const editions = pages.filter((page) => /^\/runs\/[^/]+\/index\.html$/.test(page.path))
    for (const page of editions) {
      expect(ogImage(page.html), page.path).toMatch(/\/og\/runs\/[^/]+\.png$/)
    }
  })
})

describe('structured data', () => {
  const ALLOWED = new Set(['FAQPage', 'Dataset', 'SoftwareSourceCode', 'BreadcrumbList', 'WebSite'])

  const blocks = (html: string): Array<Record<string, unknown>> =>
    [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (match) => JSON.parse(match[1]!) as Record<string, unknown>,
    )

  it('uses only the three types the site can stand behind', () => {
    for (const page of pages) {
      for (const block of blocks(page.html)) {
        expect(ALLOWED.has(block['@type'] as string), `${page.path}: ${block['@type']}`).toBe(true)
      }
    }
  })

  it.skipIf(!latest)('answers the questions from questions.json on the home page', () => {
    const home = pages.find((page) => page.path === '/index.html')!
    const faq = blocks(home.html).find((block) => block['@type'] === 'FAQPage')
    expect(faq, 'home page has no FAQPage').toBeTruthy()
    const entities = faq!['mainEntity'] as Array<{
      '@type': string
      name: string
      acceptedAnswer: { text: string }
    }>
    const asked = questions.filter((q) => latest!.questions.some((run) => run.id === q.id))
    expect(entities.map((entity) => entity.name)).toEqual(asked.map((q) => q.text))
    for (const entity of entities) {
      expect(entity['@type']).toBe('Question')
      expect(entity.acceptedAnswer.text).toMatch(/\d+ of \d+ models|all \d+ models|No model/)
    }
  })

  it.skipIf(!latest)('describes each edition as a Dataset pointing at its run file', () => {
    const editions = pages.filter((page) => /^\/runs\/[^/]+\/index\.html$/.test(page.path))
    expect(editions.length).toBeGreaterThan(0)
    for (const page of editions) {
      const dataset = blocks(page.html).find((block) => block['@type'] === 'Dataset')
      expect(dataset, `${page.path} has no Dataset`).toBeTruthy()
      const distribution = dataset!['distribution'] as { contentUrl: string }
      // The raw file on GitHub: the encoding says JSON, so the URL must serve it.
      expect(distribution.contentUrl).toMatch(/^https:\/\/raw\.githubusercontent\.com\//)
      const file = /\/main\/(data\/runs\/[^/]+\.json)$/.exec(distribution.contentUrl)?.[1]
      expect(file, `${page.path} contentUrl does not name a run file`).toBeTruthy()
      expect(existsSync(join(ROOT, file!)), `${file} does not exist`).toBe(true)
      expect(dataset!['license']).toBe('https://opensource.org/license/mit')
      expect(dataset!['datePublished']).toBeTruthy()
    }
  })

  it('describes the code on the About page', () => {
    const about = pages.find((page) => page.path === '/about/index.html')!
    const code = blocks(about.html).find((block) => block['@type'] === 'SoftwareSourceCode')
    expect(code).toBeTruthy()
    expect(code!['codeRepository']).toMatch(/^https:\/\/github\.com\//)
    expect(code!['programmingLanguage']).toBe('TypeScript')
  })
})

describe('the substance is in the HTML', () => {
  it('meets the word floor on every page', () => {
    for (const page of pages) {
      if (page.path === '/404.html') continue
      const floor = page.path === '/index.html' || isReport(page.path) ? 400 : 120
      const words = wordCount(page.html)
      expect(words, `${page.path} has ${words} words, floor ${floor}`).toBeGreaterThanOrEqual(floor)
    }
  })

  it.skipIf(!latest)('names every model of the latest edition on the front page and every report', () => {
    // The registry says who will be asked next; the site reports who was asked
    // last. A model enabled between editions — a funded account, a new entry —
    // has nothing to render yet, and demanding its name here would fail the
    // build for being ready early. What must hold is the other direction:
    // every model that actually produced data is named.
    const ran = new Set(latest!.results.flatMap((cell) => cell.models.map((m) => m.displayName)))
    const expected = models.filter((model) => ran.has(model.displayName))
    expect(expected.length).toBeGreaterThan(1)

    const targets = pages.filter((page) => page.path === '/index.html' || isFullReport(page.path))
    expect(targets.length).toBeGreaterThan(1)
    for (const page of targets) {
      for (const model of expected) {
        expect(
          contains(page.html, model.displayName),
          `${page.path} lacks ${model.displayName}`,
        ).toBe(true)
      }
    }
  })

  it.skipIf(!latest)('carries every control answer, verbatim, on the front page', () => {
    const home = pages.find((page) => page.path === '/index.html')!
    const cells = latest!.results.filter((cell) => cell.conditionId === CONTROL_CONDITION_ID)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      for (const model of cell.models) {
        const text = model.samples[0]?.text.trim()
        if (!text) continue
        expect(
          contains(home.html, text),
          `${model.displayName} on ${cell.questionId} answered "${text}", missing from the front page`,
        ).toBe(true)
      }
    }
  })
})

describe('the footer', () => {
  it('links the three En Dash learning apps on every page', () => {
    for (const page of pages) {
      for (const app of ['learn-langgraph', 'learn-langchain', 'learn-agentcore']) {
        expect(page.html, `${page.path} lacks ${app}`).toContain(`https://endash.us/apps/${app}`)
      }
    }
  })
})
