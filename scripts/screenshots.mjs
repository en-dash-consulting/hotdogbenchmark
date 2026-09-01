/**
 * Captures the README screenshots from the real built site.
 *
 * Generated rather than hand-taken so they cannot silently become a picture of
 * a design that no longer exists. Re-run after a visual change.
 *
 * Usage: node scripts/screenshots.mjs
 */
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright'

const DIST = resolve('dist')
const OUT = 'docs/images'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    let path = join(DIST, decodeURIComponent(url.pathname))
    const info = await stat(path).catch(() => null)
    if (info?.isDirectory()) path = join(path, 'index.html')
    response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
    response.end(await readFile(path))
  } catch {
    response.writeHead(404).end('not found')
  }
})

const port = await new Promise((done) => {
  server.listen(0, '127.0.0.1', () => done(server.address().port))
})

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

const shots = [
  { name: 'report-light', route: '/reports/hot-dog/', scheme: 'light', height: 1100 },
  { name: 'report-dark', route: '/reports/hot-dog/', scheme: 'dark', height: 1100 },
]

for (const shot of shots) {
  const context = await browser.newContext({
    colorScheme: shot.scheme,
    viewport: { width: 1280, height: shot.height },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await page.goto(`http://127.0.0.1:${port}${shot.route}`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(OUT, `${shot.name}.png`) })
  await context.close()
  console.log(`  ${OUT}/${shot.name}.png`)
}

await browser.close()
server.close()
console.log(`Screenshots: ${shots.length} captured.`)
