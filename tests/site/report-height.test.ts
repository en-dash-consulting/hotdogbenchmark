import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { readFileSync, rmSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright'

/**
 * The report page has a height budget.
 *
 * The first report was 11,780 px tall at 1280 wide and 27,711 px on a phone,
 * because it listed the same models six times. After the diet it measured
 * 7,884 and 7,380; the share line in the masthead then added a row, 8,049. The budget keeps the diet honest: a component that
 * reintroduces a roster fails here before a reader has to scroll through it.
 * The numbers are for the Week 36 edition's eleven models; an edition with
 * many more will need a proportionate budget, which is a decision, not a
 * regression.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIST = join(ROOT, 'dist-height-test')
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

/**
 * The budget scales with the field: every model is one standings row and one
 * card. Eleven models measured 8,049 px at 1280 and 7,380 at 390; twelve,
 * 8,715 and 7,881. The base covers the masthead, summary, framing section and
 * chart, and the per-model slice covers a row and a third of a card row. The
 * Linux runner lays text out a little taller than a Mac (8,047 at 390 for
 * twelve models against 7,881 locally), so the phone base carries that slack.
 */
const modelCount = (
  JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
    models: Array<{ enabled: boolean }>
  }
).models.filter((m) => m.enabled).length
const DESKTOP_BUDGET = 4200 + 400 * modelCount
const PHONE_BUDGET = 5500 + 250 * modelCount

const questions = (
  JSON.parse(readFileSync(join(ROOT, 'questions.json'), 'utf8')) as {
    questions: Array<{ id: string; enabled: boolean; status?: string }>
  }
).questions.filter((q) => q.enabled && (q.status ?? 'live') === 'live')

let server: Server
let port: number
let browser: Browser

beforeAll(async () => {
  rmSync(DIST, { recursive: true, force: true })
  execFileSync('npx', ['astro', 'build'], {
    cwd: ROOT,
    env: { ...process.env, ASTRO_OUT_DIR: DIST },
    stdio: 'ignore',
  })
  server = createServer(async (request, response) => {
    try {
      let path = join(DIST, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname))
      const info = await stat(path).catch(() => null)
      if (info?.isDirectory()) path = join(path, 'index.html')
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'text/plain' })
      response.end(await readFile(path))
    } catch {
      response.writeHead(404).end()
    }
  })
  port = await new Promise<number>((done) =>
    server.listen(0, () => done((server.address() as { port: number }).port)),
  )
  browser = await chromium.launch()
}, 300_000)

afterAll(async () => {
  await browser?.close()
  server?.close()
  rmSync(DIST, { recursive: true, force: true })
})

async function heightOf(path: string, width: number): Promise<number> {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
  })
  await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.close()
  return height
}

describe('the report page height', () => {
  it(`stays under ${DESKTOP_BUDGET} px at 1280 wide`, async () => {
    for (const question of questions) {
      const height = await heightOf(`/reports/${question.id}/`, 1280)
      expect(height, `${question.id} is ${height} px tall at 1280`).toBeLessThan(DESKTOP_BUDGET)
    }
  }, 120_000)

  it(`stays under ${PHONE_BUDGET} px at 390 wide, with the roster folded`, async () => {
    for (const question of questions) {
      const height = await heightOf(`/reports/${question.id}/`, 390)
      expect(height, `${question.id} is ${height} px tall at 390`).toBeLessThan(PHONE_BUDGET)
    }
  }, 120_000)

  it('names every model exactly twice outside the evidence list: standings and roster', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(`http://localhost:${port}/reports/${questions[0]!.id}/`, {
      waitUntil: 'networkidle',
    })
    const counts = await page.evaluate(() => {
      const standings = document.querySelectorAll('[data-results-table] tbody tr').length
      const cards = document.querySelectorAll('article.profile').length
      return { standings, cards }
    })
    expect(counts.standings).toBeGreaterThan(0)
    expect(counts.cards).toBe(counts.standings)
    await page.close()
  })
})
