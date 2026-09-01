import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

/**
 * Assertions over the actual built HTML.
 *
 * Structural accessibility properties — one h1, landmark regions, a working
 * skip link — are checked here rather than only by axe, because they are cheap
 * to verify and expensive to notice by eye once there are twenty pages.
 *
 * The build runs once for the whole file.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIST = join(ROOT, 'dist')

let pages: Array<{ path: string; html: string }> = []

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'ignore' })

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
}, 120_000)

describe('the build', () => {
  it('emits pages', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  it('emits a sitemap', () => {
    expect(existsSync(join(DIST, 'sitemap-index.xml'))).toBe(true)
  })
})

describe('every built page', () => {
  it('has exactly one h1', () => {
    for (const page of pages) {
      const count = (page.html.match(/<h1[\s>]/g) ?? []).length
      expect(count, `${page.path} has ${count} h1 elements`).toBe(1)
    }
  })

  it('declares a language', () => {
    for (const page of pages) {
      expect(page.html, page.path).toMatch(/<html[^>]+lang="en"/)
    }
  })

  it('has header, nav, main and footer landmarks', () => {
    for (const page of pages) {
      for (const landmark of ['<header', '<nav', '<main', '<footer']) {
        expect(page.html, `${page.path} is missing ${landmark}`).toContain(landmark)
      }
    }
  })

  it('has a skip link pointing at the main landmark', () => {
    for (const page of pages) {
      expect(page.html, page.path).toContain('href="#main"')
      expect(page.html, page.path).toContain('id="main"')
    }
  })

  it('has a title and a meta description', () => {
    for (const page of pages) {
      expect(page.html, page.path).toMatch(/<title>[^<]+<\/title>/)
      expect(page.html, page.path).toMatch(/<meta name="description" content="[^"]+"/)
    }
  })

  it('has a canonical URL', () => {
    for (const page of pages) {
      expect(page.html, page.path).toMatch(/<link rel="canonical" href="[^"]+"/)
    }
  })

  it('marks exactly one nav item as the current page, or none', () => {
    for (const page of pages) {
      const count = (page.html.match(/aria-current="page"/g) ?? []).length
      expect(count, `${page.path} marks ${count} items current`).toBeLessThanOrEqual(1)
    }
  })

  it('sets a viewport so the page is usable on a phone', () => {
    for (const page of pages) {
      expect(page.html, page.path).toContain('name="viewport"')
    }
  })

  it('uses no inline event handler attributes', () => {
    // onclick= and friends are both a CSP problem and a sign that behaviour
    // has leaked out of the one script this site ships.
    for (const page of pages) {
      expect(page.html, page.path).not.toMatch(/\son(click|load|error|mouseover)=/i)
    }
  })

  it('contains no decorative emoji, which the visual brief forbids', () => {
    // The joke lives in the words. Nothing in the presentation winks.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const page of pages) {
      const body = page.html.replace(/<script[\s\S]*?<\/script>/g, '')
      expect(emoji.test(body), `${page.path} contains emoji`).toBe(false)
    }
  })
})

describe('internal links', () => {
  it('all go through the configured base path', () => {
    // With no base configured the base is "/", so this mainly guards the shape
    // of the links; the deployed check is that nothing hardcodes a bare path
    // that would break under /<repo>/.
    for (const page of pages) {
      const hrefs = [...page.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!)
      for (const href of hrefs) {
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue
        expect(href, `${page.path} has a relative link: ${href}`).toMatch(/^\//)
      }
    }
  })
})

describe('the client JavaScript budget', () => {
  it('is under 30 KB gzipped across the whole site', () => {
    const scripts = readdirSync(join(DIST, '_astro'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => readFileSync(join(DIST, '_astro', entry.name)))

    // Inline module scripts count too — this site's theme toggle is one.
    const inline = pages.flatMap((page) =>
      [...page.html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) =>
        Buffer.from(m[1]!),
      ),
    )

    const total = [...scripts, ...inline].reduce((sum, buffer) => sum + gzipSync(buffer).length, 0)
    expect(total, `${total} bytes gzipped`).toBeLessThan(30 * 1024)
  })
})

/**
 * The printable edition.
 *
 * The PDF is generated by Chromium's print-to-PDF against the print
 * stylesheet, so there is no second layout to keep in sync — but that also
 * means a broken print stylesheet produces a broken PDF silently. These checks
 * assert the properties that make the artefact worth offering at all.
 */
describe('the PDF edition', () => {
  const reportsDir = join(DIST, 'reports')

  const questionDirs = () =>
    existsSync(reportsDir)
      ? readdirSync(reportsDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : []

  it('emits one PDF per enabled question', () => {
    const dirs = questionDirs()
    expect(dirs.length).toBeGreaterThan(0)
    for (const dir of dirs) {
      expect(existsSync(join(reportsDir, dir, 'report.pdf')), `${dir} has no PDF`).toBe(true)
    }
  })

  it('is a real PDF with more than one page', () => {
    for (const dir of questionDirs()) {
      const pdf = readFileSync(join(reportsDir, dir, 'report.pdf'))
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
      const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
      expect(pageCount, `${dir} has ${pageCount} pages`).toBeGreaterThan(1)
    }
  })

  it('has a text layer rather than being a page of images', () => {
    // Embedded fonts and no image XObjects means the glyphs are text: the PDF
    // is searchable and selectable, which is the whole point of offering it.
    for (const dir of questionDirs()) {
      const pdf = readFileSync(join(reportsDir, dir, 'report.pdf')).toString('latin1')
      const fonts = new Set(pdf.match(/\/BaseFont\s*\/[A-Za-z0-9+\-,_]+/g) ?? [])
      expect(fonts.size, `${dir} embeds no fonts`).toBeGreaterThan(0)
      expect(pdf).not.toMatch(/\/Subtype\s*\/Image/)
    }
  })

  it('carries a document title and a structure tree', () => {
    for (const dir of questionDirs()) {
      const pdf = readFileSync(join(reportsDir, dir, 'report.pdf')).toString('latin1')
      expect(pdf, `${dir} has no /Title`).toMatch(/\/Title/)
      // Tagged, so a screen reader can navigate its headings.
      expect(pdf, `${dir} is not tagged`).toContain('/StructTreeRoot')
    }
  })

  it('is linked from its report page', () => {
    for (const dir of questionDirs()) {
      const html = readFileSync(join(reportsDir, dir, 'index.html'), 'utf8')
      expect(html, `${dir} does not link its PDF`).toContain(`reports/${dir}/report.pdf`)
    }
  })
})

describe('the print stylesheet', () => {
  const css = readFileSync(new URL('../../src/site/styles/print.css', import.meta.url), 'utf8')

  it('forces the light palette, since a dark print is a black page', () => {
    expect(css).toContain(":root[data-theme='dark']")
    expect(css).toMatch(/--bg:\s*#ffffff/i)
  })

  it('hides navigation chrome that means nothing on paper', () => {
    for (const selector of ['.skip-link', '.theme-toggle', '.controls']) {
      expect(css, `${selector} is still printed`).toContain(selector)
    }
  })

  it('prevents rows, cards and figures splitting across pages', () => {
    expect(css).toMatch(/break-inside:\s*avoid/)
    expect(css).toMatch(/page-break-inside:\s*avoid/)
  })

  it('repeats table headers on every page', () => {
    expect(css).toContain('table-header-group')
  })

  it('expands external link URLs, since a printed link is otherwise dead text', () => {
    expect(css).toMatch(/a\[href\^='http'\]::after/)
    expect(css).toContain('attr(href)')
  })

  it('sets an explicit page size and margins', () => {
    expect(css).toMatch(/@page\s*\{[\s\S]*?size:\s*A4/)
    expect(css).toMatch(/@page\s*\{[\s\S]*?margin:/)
  })
})
