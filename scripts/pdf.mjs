/**
 * Generates a printable PDF of each report page, after the site is built.
 *
 * Uses Chromium's own print-to-PDF, so what it produces is exactly what a
 * reader gets from File → Print — the print stylesheet is the single source of
 * truth rather than there being a separate PDF layout to keep in sync.
 *
 * The PDFs have a real text layer (Chromium prints text as text, not as an
 * image), so they are searchable and selectable.
 *
 * ## Caching
 *
 * Regeneration is skipped when the run id has not changed, recorded alongside
 * each PDF in a small stamp file. Rendering seven pages through a browser is
 * the slowest step in the build, and a docs-only change should not pay for it.
 * Pass `--force` to regenerate regardless.
 *
 * Usage: node scripts/pdf.mjs [--force]
 */
import { createServer } from 'node:http'
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright'

const DIST = resolve('dist')
const FORCE = process.argv.includes('--force')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
}

function serve(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      let path = join(root, decodeURIComponent(url.pathname))
      const info = await stat(path).catch(() => null)
      if (info?.isDirectory()) path = join(path, 'index.html')
      response.writeHead(200, {
        'content-type': MIME[extname(path)] ?? 'application/octet-stream',
      })
      response.end(await readFile(path))
    } catch {
      response.writeHead(404).end('not found')
    }
  })
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port }))
  })
}

// The current run id, so an unchanged report is not re-rendered.
let runId = 'unknown'
try {
  const manifest = JSON.parse(await readFile('data/index.json', 'utf8'))
  runId = manifest.runs?.[0]?.runId ?? 'unknown'
} catch {
  // No data yet. Every PDF is then trivially out of date, which is correct.
}

const reportsDir = join(DIST, 'reports')
if (!existsSync(reportsDir)) {
  console.log('No report pages built; nothing to render.')
  process.exit(0)
}

const questions = (await readdir(reportsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const { server, port } = await serve(DIST)
const browser = await chromium.launch()
let rendered = 0
let skipped = 0

try {
  for (const questionId of questions) {
    const outDir = join(reportsDir, questionId)
    const pdfPath = join(outDir, 'report.pdf')
    const stampPath = join(outDir, '.report-pdf-runid')

    if (!FORCE && existsSync(pdfPath) && existsSync(stampPath)) {
      const stamp = await readFile(stampPath, 'utf8')
      if (stamp.trim() === runId) {
        skipped += 1
        continue
      }
    }

    const page = await browser.newPage()
    // Force the light theme: a dark-theme print is a solid black page and the
    // printer will happily produce it.
    await page.emulateMedia({ media: 'print', colorScheme: 'light' })
    await page.goto(`http://127.0.0.1:${port}/reports/${questionId}/`, {
      waitUntil: 'networkidle',
    })

    const title = await page.title()

    await mkdir(outDir, { recursive: true })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      // A tagged PDF carries heading structure and a document title, so it is
      // navigable by a screen reader rather than being a flat page of glyphs.
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:7pt;color:#4a5464;width:100%;padding:0 16mm;">${title}</div>`,
      footerTemplate:
        '<div style="font-size:7pt;color:#4a5464;width:100%;padding:0 16mm;text-align:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: '20mm', bottom: '18mm', left: '16mm', right: '16mm' },
    })

    await writeFile(stampPath, runId + '\n')
    await page.close()
    rendered += 1
    console.log(`  reports/${questionId}/report.pdf`)
  }
} finally {
  await browser.close()
  server.close()
}

console.log(`PDF edition: ${rendered} rendered, ${skipped} unchanged (run ${runId.slice(0, 8)}).`)
