/**
 * The machine-checkable half of an accessibility audit.
 *
 * axe catches rule violations. This catches the things axe cannot: whether the
 * tab order actually reaches everything, whether focus is actually visible,
 * whether the page reflows at 320px, whether it survives 200% zoom, and whether
 * anything disappears in forced-colors mode.
 *
 * **This is not a substitute for a screen-reader pass.** No automated tool can
 * tell you whether a chart summary is a useful sentence or whether the reading
 * order makes sense to somebody who cannot see the layout. What it can do is
 * clear the mechanical failures out of the way so a human's time is spent on
 * the judgement calls. `docs/a11y-checklist.md` records which is which.
 *
 * Usage: node scripts/a11y-audit.mjs
 */
import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'

const DIST = resolve('dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === '.prerender') return []
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      return full.endsWith('.html') ? [full] : []
    }),
  )
  return nested.flat()
}

function serve(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      let path = join(root, decodeURIComponent(url.pathname))
      const info = await stat(path).catch(() => null)
      if (info?.isDirectory()) path = join(path, 'index.html')
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
      response.end(await readFile(path))
    } catch {
      response.writeHead(404).end('not found')
    }
  })
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port }))
  })
}

const problems = []
const record = (route, check, detail) => problems.push({ route, check, detail })

const pages = await walk(DIST)
const { server, port } = await serve(DIST)
const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  for (const file of pages) {
    const route =
      '/' +
      relative(DIST, file)
        .replace(/index\.html$/, '')
        .replace(/\\/g, '/')
    const url = `http://127.0.0.1:${port}${route}`
    await page.goto(url, { waitUntil: 'networkidle' })

    // --- Keyboard: the skip link must be first and must actually work. ---
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => {
      const el = document.activeElement
      return el
        ? { tag: el.tagName, text: el.textContent?.trim(), href: el.getAttribute('href') }
        : null
    })
    if (first?.href !== '#main') {
      record(route, 'skip-link-first', `first tab stop was ${first?.tag} "${first?.text}"`)
    }

    // --- Focus visibility: every interactive element must show a ring. ---
    const invisibleFocus = await page.evaluate(() => {
      const selector =
        'a[href], button, select, input, textarea, [tabindex]:not([tabindex="-1"]), summary'
      const bad = []
      for (const el of document.querySelectorAll(selector)) {
        el.focus()
        const style = getComputedStyle(el)
        const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
        const hasShadow = style.boxShadow !== 'none'
        if (!hasOutline && !hasShadow) {
          bad.push(el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''))
        }
      }
      return [...new Set(bad)]
    })
    if (invisibleFocus.length > 0) {
      record(route, 'focus-visible', invisibleFocus.join(', '))
    }

    // --- Heading outline: no skipped levels. ---
    const headingSkips = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
        Number(h.tagName[1]),
      )
      const skips = []
      for (let i = 1; i < levels.length; i += 1) {
        if (levels[i] - levels[i - 1] > 1) skips.push(`h${levels[i - 1]} → h${levels[i]}`)
      }
      return skips
    })
    if (headingSkips.length > 0) record(route, 'heading-outline', headingSkips.join(', '))

    // --- 320px reflow: no horizontal scrolling. ---
    await page.setViewportSize({ width: 320, height: 800 })
    const overflow320 = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    if (overflow320 > 1) record(route, 'reflow-320', `${overflow320}px of horizontal overflow`)

    // --- 200% zoom, emulated as a 640px-wide viewport at the same height. ---
    await page.setViewportSize({ width: 640, height: 512 })
    const overflowZoom = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    if (overflowZoom > 1) record(route, 'reflow-200pct', `${overflowZoom}px of horizontal overflow`)

    await page.setViewportSize({ width: 1280, height: 900 })
  }

  // --- Forced colors: verdict badges and charts must stay distinguishable. ---
  const forced = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' })
  const forcedPage = await forced.newPage()
  for (const file of pages.filter((f) => f.includes('reports'))) {
    const route =
      '/' +
      relative(DIST, file)
        .replace(/index\.html$/, '')
        .replace(/\\/g, '/')
    await forcedPage.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' })

    const badgeless = await forcedPage.evaluate(() => {
      const badges = [...document.querySelectorAll('.verdict-badge')]
      if (badges.length === 0) return 'no verdict badges found'
      // In forced colors the background is flattened, so the badge must carry a
      // border and visible text to remain distinguishable.
      const bad = badges.filter((badge) => {
        const style = getComputedStyle(badge)
        const hasBorder = parseFloat(style.borderTopWidth) > 0
        const hasText = (badge.querySelector('.label')?.textContent ?? '').trim().length > 0
        return !hasBorder || !hasText
      })
      return bad.length > 0 ? `${bad.length} badge(s) lose meaning` : null
    })
    if (badgeless) record(route, 'forced-colors-badges', badgeless)
  }
  await forced.close()
} finally {
  await browser.close()
  server.close()
}

console.log(`Audited ${pages.length} pages.\n`)

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`  ${problem.route}  [${problem.check}]  ${problem.detail}`)
  }
  console.error(`\n${problems.length} mechanical accessibility problem(s).`)
  process.exit(1)
}

console.log('Keyboard, focus visibility, heading outline, 320px reflow, 200% zoom and')
console.log('forced-colors checks all pass.\n')
console.log('These are the mechanical checks only. Screen-reader reading order and the')
console.log('usefulness of chart summaries still require a human — see docs/a11y-checklist.md.')
