/**
 * Runs axe-core over every built page, in four viewing modes.
 *
 * Serves `dist/` from a local static server, walks every HTML file, and fails
 * on any violation with the page, rule id, impact and CSS selector, enough to
 * fix it without re-running anything.
 *
 * Light, dark, forced colors and reduced motion are all checked because a
 * failure that only exists in one of them is a real failure that a
 * single-mode pass would never see.
 *
 * Usage: node scripts/a11y.mjs [--url-list] [dist-dir]
 */
import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const DIST = resolve(process.argv[2] ?? 'dist')

/** WCAG 2.2 A and AA. The level this project claims to meet. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
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

/** A minimal static server. Enough to serve a built Astro site. */
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
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => resolveServer({ server, port: server.address().port }))
  })
}

const pages = await walk(DIST)
if (pages.length === 0) {
  console.error(`No HTML found under ${DIST}. Run \`npm run build\` first.`)
  process.exit(1)
}

const { server, port } = await serve(DIST)
const browser = await chromium.launch()

let violationCount = 0
let checks = 0

/**
 * Four ways a real reader sees the site, at a phone width and a desktop one.
 *
 * Light and dark are the themes. Forced colors is Windows High Contrast, which
 * replaces every color the stylesheet sets and shows whether structure
 * survives on borders alone. Reduced motion is the state most users of
 * animation-triggered vestibular disorders browse in, and the one the answer
 * board renders statically in.
 */
const MODES = [
  { name: 'light', width: 1280, context: { colorScheme: 'light' } },
  { name: 'dark', width: 1280, context: { colorScheme: 'dark' } },
  { name: 'forced-colors', width: 1280, context: { colorScheme: 'dark', forcedColors: 'active' } },
  {
    name: 'reduced-motion',
    width: 375,
    context: { colorScheme: 'light', reducedMotion: 'reduce' },
  },
]

try {
  for (const mode of MODES) {
    const context = await browser.newContext({
      ...mode.context,
      viewport: { width: mode.width, height: Math.round(mode.width * 0.75) },
    })
    const page = await context.newPage()
    const theme = `${mode.name} @${mode.width}`

    for (const file of pages) {
      const route =
        '/' +
        relative(DIST, file)
          .replace(/index\.html$/, '')
          .replace(/\\/g, '/')
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' })

      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      checks += 1

      for (const violation of results.violations) {
        violationCount += 1
        console.error(`\n${route}  [${theme}]`)
        console.error(`  ${violation.id} (${violation.impact ?? 'unknown impact'})`)
        console.error(`  ${violation.help}`)
        console.error(`  ${violation.helpUrl}`)
        for (const node of violation.nodes.slice(0, 5)) {
          console.error(`    ${node.target.join(' ')}`)
          if (node.failureSummary) {
            console.error(`      ${node.failureSummary.replace(/\n/g, '\n      ')}`)
          }
        }
      }
    }

    await context.close()
  }
} finally {
  await browser.close()
  server.close()
}

if (violationCount > 0) {
  console.error(`\n${violationCount} accessibility violation(s) across ${checks} page checks.`)
  process.exit(1)
}

console.log(
  `No accessibility violations. ${checks} page checks (${pages.length} pages × ${MODES.length} modes).`,
)
