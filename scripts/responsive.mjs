/**
 * Responsive and pointer-target audit over the built site.
 *
 * For every page and every width in WIDTHS, this fails on:
 *
 *   - horizontal overflow: the document is wider than the viewport, which is
 *     the reflow failure WCAG 1.4.10 describes (320 CSS px is what a 1280 px
 *     screen becomes at 400% zoom);
 *   - pointer targets under 24 by 24 CSS px (WCAG 2.5.8), or under 44 px for
 *     the primary controls at the phone width;
 *   - a focused element hidden under the sticky masthead after tabbing
 *     through the page (WCAG 2.4.11, focus not obscured);
 *   - text that overflows or clips once WCAG 1.4.12's spacing is applied.
 *
 * It also writes one screenshot per page and width to --out, so a reviewer
 * can look at what a phone actually gets.
 *
 * Usage: node scripts/responsive.mjs [dist-dir] [--out dir] [--widths 320,768]
 */
import { createServer } from 'node:http'
import { mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const DIST = resolve(args.find((a) => !a.startsWith('--') && !args.includes(`--${a}`)) ?? 'dist')
const OUT = flag('--out', null)
const WIDTHS = flag('--widths', '320,375,414,768,1024,1280,1920').split(',').map(Number)

/** Elements that must be at least this big to tap. */
const MIN_TARGET = 24
/** The controls a phone user reaches for first. */
const PRIMARY_TARGET = 44
const PRIMARY_SELECTOR = [
  '.nav-list a',
  '.theme-toggle',
  '[data-question]',
  '[data-condition]',
  '[data-replay]',
  '.question-switch a',
].join(', ')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name)
      if (entry.name === '.prerender') return []
      if (entry.isDirectory()) return walk(full)
      return full.endsWith('.html') ? [full] : []
    }),
  )
  return files.flat()
}

function serve(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      let path = join(root, decodeURIComponent(url.pathname))
      const info = await stat(path).catch(() => null)
      if (info?.isDirectory()) path = join(path, 'index.html')
      const body = await readFile(path)
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
      response.end(body)
    } catch {
      response.writeHead(404).end('not found')
    }
  })
  return new Promise((done) =>
    server.listen(0, () => done({ server, port: server.address().port })),
  )
}

const pages = (await walk(DIST)).map((file) => {
  const rel = '/' + relative(DIST, file).replace(/index\.html$/, '')
  return rel.replace(/\/+/g, '/')
})

const { server, port } = await serve(DIST)
const browser = await chromium.launch()
const failures = []
if (OUT) await mkdir(OUT, { recursive: true })

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: Math.round(width * 1.6) },
    reducedMotion: 'reduce',
  })
  for (const path of pages) {
    const page = await context.newPage()
    await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'networkidle' })
    // Measure with the final fonts, not the fallback ones a label was laid out in.
    await page.evaluate(() => document.fonts.ready)

    // 1. Reflow: nothing may push the document wider than the viewport.
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    if (overflow.scroll > overflow.client + 1) {
      failures.push(
        `${path} @${width}: horizontal overflow (${overflow.scroll} > ${overflow.client})`,
      )
    }

    // 2. Targets: every visible interactive element is big enough to hit.
    const small = await page.evaluate(
      ({ min, primaryMin, primarySelector, isPhone }) => {
        const problems = []
        const primary = new Set(document.querySelectorAll(primarySelector))
        const candidates = document.querySelectorAll(
          'a[href], button, input, select, summary, [role="button"], [tabindex="0"]',
        )
        for (const el of candidates) {
          const rect = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') continue
          // Inline links inside running text are exempt from 2.5.8, as the
          // criterion itself says; block-level and control targets are not.
          const inline =
            style.display.startsWith('inline') &&
            el.tagName === 'A' &&
            el.closest('p, li, td, th, dd, dt, figcaption')
          if (inline) continue
          const need = isPhone && primary.has(el) ? primaryMin : min
          // WCAG 2.5.8's equivalent exception: a mark inside an SVG chart is
          // fine when the same link exists elsewhere on the page at full size,
          // which is what the data table under every chart provides.
          if ((rect.width < need || rect.height < need) && el.closest('svg')) {
            const href = el.getAttribute('href')
            const twin = href
              ? Array.from(document.querySelectorAll('a[href]')).find((other) => {
                  if (other === el || other.closest('svg')) return false
                  if (other.getAttribute('href') !== href) return false
                  // A twin inside a closed <details> ("Show the data") is one
                  // click away and counts; it just cannot be measured here.
                  if (other.closest('details') && !other.closest('details').open) return true
                  const box = other.getBoundingClientRect()
                  return box.width >= min && box.height >= min
                })
              : null
            if (twin) continue
          }
          if (rect.width < need || rect.height < need) {
            const label = (
              el.textContent ||
              el.getAttribute('aria-label') ||
              el.className ||
              el.tagName
            )
              .toString()
              .trim()
              .slice(0, 40)
            problems.push(
              `${label} is ${Math.round(rect.width)}x${Math.round(rect.height)} (need ${need})`,
            )
          }
        }
        return problems
      },
      {
        min: MIN_TARGET,
        primaryMin: PRIMARY_TARGET,
        primarySelector: PRIMARY_SELECTOR,
        isPhone: width <= 414,
      },
    )
    for (const problem of small) failures.push(`${path} @${width}: target ${problem}`)

    // 3. Focus not obscured: tab through everything; the focused element
    //    must never sit under the sticky masthead.
    const obscured = await page.evaluate(async () => {
      const header = document.querySelector('header.masthead')
      if (!header) return []
      const problems = []
      const focusable = Array.from(
        document.querySelectorAll('a[href], button, input, select, summary, [tabindex="0"]'),
      ).filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      for (const el of focusable) {
        el.focus({ preventScroll: false })
        await new Promise((r) => globalThis.setTimeout(r, 0))
        const rect = el.getBoundingClientRect()
        const head = header.getBoundingClientRect()
        const covered = rect.top < head.bottom && rect.bottom > head.top && !header.contains(el)
        if (covered)
          problems.push(
            (el.textContent || el.className || el.tagName).toString().trim().slice(0, 40),
          )
      }
      return problems
    })
    for (const problem of obscured)
      failures.push(`${path} @${width}: focus obscured on "${problem}"`)

    // 4. Text spacing (WCAG 1.4.12): with the criterion's spacing applied,
    //    nothing may overflow the viewport or clip inside a box.
    await page.addStyleTag({
      content:
        '* { line-height: 2 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
    })
    const spacing = await page.evaluate(() => {
      const problems = []
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
        problems.push('page overflows horizontally with text spacing applied')
      }
      for (const el of document.querySelectorAll('button, a, th, td, .word, .dot, .chip')) {
        const style = getComputedStyle(el)
        if (style.overflow !== 'hidden' && style.overflowY !== 'hidden') continue
        if (el.scrollHeight > el.clientHeight + 2) {
          problems.push(`clipped text in ${(el.className || el.tagName).toString().slice(0, 40)}`)
        }
      }
      return problems
    })
    for (const problem of spacing) failures.push(`${path} @${width}: text spacing ${problem}`)

    if (OUT) {
      const name = `${path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home'}@${width}.png`
      await page.screenshot({ path: join(OUT, name), fullPage: true })
    }
    await page.close()
  }
  await context.close()
}

await browser.close()
server.close()

if (failures.length > 0) {
  console.error(`${failures.length} responsive/target problem(s):\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}
console.log(`No responsive or target problems. ${pages.length} pages × ${WIDTHS.length} widths.`)
