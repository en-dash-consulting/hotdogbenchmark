import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

  it('emits a sitemap that lists every built page exactly once, with the data date', () => {
    const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname)
    const built = pages
      .map((page) => page.path.replace(/index\.html$/, ''))
      .filter((path) => path !== '/404.html')
    expect(listed.sort()).toEqual(built.sort())
    expect(new Set(listed).size).toBe(listed.length)
    expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/)
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

  /** The site nav only; sub-navs (framings, history questions) mark their own current item. */
  const mainNav = (html: string) =>
    html.match(/<ul class="nav-list"[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? ''

  it('never glues inline markup to the words around it', () => {
    // Astro drops the newline between a line of text and a tag on the next
    // line inside expressions, so "are all\n<a>on GitHub</a>" renders as
    // "allon GitHub". The templates carry an explicit {' '} at those seams.
    const glued = /[A-Za-z0-9,.;:)]<(a|code|strong|em|q)[ >]|<\/(a|code|strong|em|q)>[A-Za-z0-9(“]/g
    for (const page of pages) {
      const body = page.html
        .replace(/<pre[\s\S]*?<\/pre>/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
      const hits = [...body.matchAll(glued)].map((m) =>
        body.slice(Math.max(0, m.index! - 30), m.index! + 40),
      )
      expect(hits, `${page.path}: ${hits.join(' | ')}`).toEqual([])
    }
  })

  it('marks Reports current on the landing page and on every report under it', () => {
    const under = pages.filter((page) => /^\/reports\//.test(page.path))
    expect(under.length).toBeGreaterThan(1)
    for (const page of under) {
      const current = mainNav(page.html).match(
        /<a href="([^"]*)" aria-current="page"[^>]*>([^<]*)</,
      )
      expect(current?.[2]?.trim(), `${page.path} does not mark Reports current`).toBe('Reports')
      expect(current?.[1], page.path).toMatch(/\/reports\/$/)
    }
    const home = pages.find((page) => page.path === '/index.html' || page.path === '/')!
    expect(mainNav(home.html), 'home page marks a nav item current').not.toMatch(
      /aria-current="page"/,
    )
  })

  it('marks exactly one site nav item as the current page, or none', () => {
    for (const page of pages) {
      const count = (mainNav(page.html).match(/aria-current="page"/g) ?? []).length
      expect(count, `${page.path} marks ${count} nav items current`).toBeLessThanOrEqual(1)
    }
  })

  it('sets a viewport so the page is usable on a phone', () => {
    for (const page of pages) {
      expect(page.html, page.path).toContain('name="viewport"')
    }
  })

  it('uses no inline event handler attributes', () => {
    // onclick= and friends are both a CSP problem and a sign that behavior
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

/**
 * The framing-sensitivity views exist exactly when the latest edition ran
 * more than the control. Read the data rather than assuming, so this test is
 * right both before and after the first multi-condition edition lands.
 */
describe('experimental conditions in the built report', () => {
  const runs = readdirSync(join(ROOT, 'data/runs'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .reverse()
  const latest = runs[0]
    ? (JSON.parse(readFileSync(join(ROOT, 'data/runs', runs[0]), 'utf8')) as {
        conditions?: Array<{ id: string }>
        questions: Array<{ id: string }>
      })
    : null
  // A version-1 file has no conditions array and migrates to the control alone.
  const conditionIds = latest?.conditions?.map((c) => c.id) ?? ['control']
  const treated = conditionIds.filter((id) => id !== 'control')
  const questionIds = latest?.questions.map((q) => q.id) ?? []
  const read = (path: string) => readFileSync(join(DIST, path, 'index.html'), 'utf8')

  it('renders the comparison on every report page, or on none, according to the data', () => {
    for (const questionId of questionIds) {
      const html = read(`reports/${questionId}`)
      if (treated.length > 0) {
        expect(html, `${questionId} lacks the framing section`).toContain('Framing sensitivity')
        expect(html).toContain('Position by framing')
        expect(html).toContain('verbatim')
      } else {
        expect(html, `${questionId} shows an empty comparison`).not.toContain('framing-heading')
      }
    }
  })

  it('never leaves one-word compliance to stand alone as the only instruction number', () => {
    for (const questionId of questionIds) {
      const html = read(`reports/${questionId}`)
      // "Instruction compliance" invited the reading that the number covered
      // the framing's system prompt. It counts answer length and nothing else.
      expect(html, `${questionId} still calls it instruction compliance`).not.toContain(
        'Instruction compliance',
      )
      expect(html).toContain('One-word compliance')
      if (treated.length > 0) {
        // The framing result sits in the same KPI row and the same table, so
        // neither can be read without the other.
        expect(html, `${questionId} lacks the framing KPI`).toContain('Held under framing')
        expect(html, `${questionId} lacks the framing column`).toContain('Framing shift')
        expect(html).toMatch(/Moved: |>Held</)
      }
    }
  })

  it("names each model's position against the control on a framing report", () => {
    for (const questionId of questionIds) {
      for (const conditionId of treated) {
        const html = readFileSync(
          join(DIST, 'reports', questionId, conditionId, 'index.html'),
          'utf8',
        )
        expect(html, `${questionId}/${conditionId} lacks the control comparison`).toContain(
          'Held vs. control',
        )
        expect(html).toContain('vs. control')
        // Every model either held or moved; a cell that says neither means the
        // column rendered without data behind it.
        expect(html).toMatch(/Held (Yes|No|no answer)|Moved to (Yes|No|no answer)/)
      }
    }
  })

  it('emits one full report per non-control framing, and none when there are none', () => {
    for (const questionId of questionIds) {
      for (const conditionId of treated) {
        const path = join(DIST, 'reports', questionId, conditionId, 'index.html')
        expect(existsSync(path), `${questionId}/${conditionId} was not built`).toBe(true)
        const html = readFileSync(path, 'utf8')
        expect(html).toContain('framing')
        expect(html).toContain('System prompt')
      }
      if (treated.length === 0) {
        const dirs = readdirSync(join(DIST, 'reports', questionId), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
        expect(dirs).toEqual([])
      }
    }
  })

  it('renders the comparison complete without JavaScript, and ships only the explorer on top', () => {
    // The comparison is HTML, SVG and <details>. The explorer island is the
    // one script the section adds, and the results table the one the page
    // adds; both reveal their controls only after they have run.
    if (treated.length === 0) return
    // A JSON-LD block is data in a script element, not a script; it is not
    // counted on either side.
    const scriptCount = (html: string) =>
      (html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/g) ?? []).length
    const baseline = scriptCount(read('about'))
    for (const questionId of questionIds) {
      const html = read(`reports/${questionId}`)
      const start = html.indexOf('id="framing-heading"')
      expect(start, `${questionId} has no framing section`).toBeGreaterThan(-1)
      const scripts = scriptCount(html)
      expect(scripts, `${questionId} ships ${scripts} scripts`).toBe(baseline + 2)
    }
  })

  it('hides the framing explorer controls until its script reveals them', () => {
    for (const questionId of questionIds) {
      if (treated.length === 0) continue
      const html = read(`reports/${questionId}`)
      expect(html).toMatch(/<div class="explorer[^"]*" data-explorer[^>]*hidden/)
      // Explorer keys are provider/model; the results table's data-vendor is a
      // vendor name with no slash, so the slash is what tells them apart.
      const rows = (html.match(/<tr[^>]*data-vendor="[^"]*\//g) ?? []).length
      const items = (html.match(/<li[^>]*data-vendor="[^"]*\//g) ?? []).length
      expect(rows, `${questionId} matrix rows`).toBeGreaterThan(0)
      expect(items, `${questionId} verbatim items`).toBe(rows)
    }
  })

  it('defines the sensitivity measure on the methodology page from the shared constant', () => {
    const html = read('methodology')
    expect(html).toContain('Framing sensitivity')
    expect(html).toMatch(/neither robustness nor compliance/i)
    expect(html).toContain('conditions.json')
  })

  it('gives every sensitivity chart a data-table alternative', () => {
    for (const questionId of questionIds) {
      if (treated.length === 0) continue
      const html = read(`reports/${questionId}`)
      expect(html).toContain('Framing sensitivity by vendor — data')
    }
  })
})

/**
 * Chart marks are links into the evidence, with native tooltips, and no
 * JavaScript. Every mark must point at a profile that exists on the page.
 */
describe('chart marks', () => {
  const read = (path: string) => readFileSync(join(DIST, path, 'index.html'), 'utf8')
  // Read lazily: at collection time dist/ may not exist yet on a fresh runner.
  const questionIds = () =>
    readdirSync(join(DIST, 'reports'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

  it('link every plotted vendor to a profile card on the same page', () => {
    for (const questionId of questionIds()) {
      const html = read(`reports/${questionId}`)
      const targets = [...html.matchAll(/class="mark[^"]*" href="#(profile-[^"]+)"/g)].map(
        (m) => m[1]!,
      )
      expect(targets.length, `${questionId} has no linked marks`).toBeGreaterThan(0)
      for (const target of targets) {
        expect(html, `${questionId}: no element with id ${target}`).toContain(`id="${target}"`)
      }
    }
  })

  it('give every linked mark a native tooltip', () => {
    for (const questionId of questionIds()) {
      const html = read(`reports/${questionId}`)
      const marks = (html.match(/class="mark[^"]*" href=/g) ?? []).length
      const titles = (html.match(/<a class="mark[^>]*>\s*<title>/g) ?? []).length
      expect(titles, `${questionId}: ${marks} marks, ${titles} tooltips`).toBe(marks)
    }
  })

  it('link the alignment grid on the front page into the report profiles', () => {
    const html = read('')
    const dots = [...html.matchAll(/class="dot[^"]*" href="([^"]+)"/g)].map((m) => m[1]!)
    expect(dots.length).toBeGreaterThan(0)
    for (const href of dots) expect(href).toMatch(/\/reports\/[^/]+\/#profile-/)
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
  it('is enforced by scripts/js-budget.mjs against the built site', () => {
    // Delegated rather than reimplemented here. The rule has real subtleties —
    // the feature-flagged /run/ bundle is excluded, and Astro emits that bundle
    // even when the page is not generated, leaving it orphaned — and having two
    // implementations of it means one of them is wrong.
    const output = execFileSync('node', ['scripts/js-budget.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(output).toContain('Within budget.')
  })
})

/**
 * The printable edition.
 *
 * The PDF is generated by Chromium's print-to-PDF against the print
 * stylesheet, so there is no second layout to keep in sync — but that also
 * means a broken print stylesheet produces a broken PDF silently. These checks
 * assert the properties that make the artifact worth offering at all.
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

/**
 * The learn pages carry the project's honesty. These checks make sure the
 * specific claims that matter are actually on the page, and that the code
 * excerpts really came from source.
 */
describe('the learn pages', () => {
  const read = (path: string) => readFileSync(join(DIST, path, 'index.html'), 'utf8')

  it('how-it-works excerpts the real adapter interface from source', () => {
    const html = read('how-it-works')
    // If this string is not present, the excerpt marker was removed and the
    // page would be describing code that no longer exists.
    expect(html).toContain('complete(request: CompleteRequest, context: AdapterContext)')
    expect(html).toContain('readSseJson')
  })

  it('how-it-works has a diagram with a text alternative and seven steps', () => {
    const html = read('how-it-works')
    expect(html).toMatch(/role="img"[^>]*aria-label="Pipeline diagram/)
    expect((html.match(/<h2/g) ?? []).length).toBeGreaterThanOrEqual(7)
  })

  it('methodology renders the live synonym lists rather than a copy', () => {
    // Astro adds a scoping attribute to every element, so match the content of
    // a <code> element rather than an exact tag string.
    const codeContents = new Set(
      [...read('methodology').matchAll(/<code[^>]*>([^<]+)<\/code>/g)].map((m) => m[1]!),
    )
    for (const word of ['yes', 'yeah', 'absolutely', 'nope', 'never', 'technically']) {
      expect(codeContents, `missing synonym: ${word}`).toContain(word)
    }
  })

  it('methodology states the limitations plainly', () => {
    const html = read('methodology')
    expect(html).toContain('What this does not measure')
    expect(html).toMatch(/questions are silly/i)
    expect(html).toMatch(
      /nothing in this publication measures model\s*<\/strong>?\s*quality|measures model\s+quality/i,
    )
  })

  it('methodology explains what latency does and does not measure', () => {
    const html = read('methodology')
    expect(html).toMatch(/not a measure of inference speed/i)
    expect(html).toMatch(/GitHub-hosted runner/i)
  })

  it('methodology has keyboard-navigable footnotes with back-links', () => {
    const html = read('methodology')
    expect(html).toContain('id="fn1"')
    expect(html).toContain('href="#fnref1"')
    expect(html).toContain('id="fnref1"')
  })

  it('methodology says no model writes the report', () => {
    const html = read('methodology')
    expect(html).toMatch(/No language model writes any of it/i)
    expect(html).toContain('src/site/lib/prose.ts')
    expect(html).toMatch(/quoted\s*\n?\s*verbatim|verbatim/i)
  })

  it('methodology separates one-word compliance from premise adoption', () => {
    const html = read('methodology')
    // The KPI tile reads 100% even when models ignore the framing's system
    // prompt. If this explanation goes missing the number is misleading.
    expect(html).toMatch(/counts one thing and only one thing/i)
    expect(html).toContain('href="#sensitivity"')
  })

  it('methodology documents every constructed score with its formula', () => {
    const html = read('methodology')
    for (const name of ['Decisiveness', 'Efficiency', 'Composite score']) {
      expect(html, `missing score: ${name}`).toContain(name)
    }
    expect(html).toMatch(/constructed measures, not/i)
  })

  it('add-a-model gives exact commands and file paths', () => {
    const html = read('add-a-model')
    expect(html).toContain('bench:smoke')
    expect(html).toContain('bench:record')
    expect(html).toContain('models.json')
    expect(html).toContain('anthropic.ts')
    expect(html).toContain('add_model_or_provider.yml')
    expect(html).toContain('CONTRIBUTING.md')
  })
})

describe('SEO and social metadata', () => {
  it('gives every page OpenGraph and Twitter card tags with an absolute image URL', () => {
    for (const page of pages) {
      expect(page.html, `${page.path} has no og:title`).toMatch(/property="og:title"/)
      expect(page.html, `${page.path} has no og:description`).toMatch(/property="og:description"/)
      expect(page.html, `${page.path} has no og:image`).toMatch(/property="og:image"/)
      expect(page.html, `${page.path} has no twitter:card`).toMatch(/name="twitter:card"/)
      // A relative og:image is silently ignored by every card validator.
      const image = /property="og:image" content="([^"]+)"/.exec(page.html)?.[1]
      expect(image, `${page.path} og:image is not absolute`).toMatch(/^https?:\/\//)
    }
  })

  it('gives every OG image alt text and explicit dimensions', () => {
    for (const page of pages) {
      expect(page.html).toMatch(/property="og:image:alt"/)
      expect(page.html).toContain('content="1200"')
      expect(page.html).toContain('content="630"')
    }
  })

  it('renders an OG card per report plus a site default', () => {
    const ogDir = join(DIST, 'og')
    expect(existsSync(ogDir)).toBe(true)
    const cards = readdirSync(ogDir).filter((name) => name.endsWith('.png'))
    expect(cards).toContain('default.png')
    expect(cards).toContain('hot-dog.png')
    for (const card of cards) {
      const bytes = readFileSync(join(ogDir, card))
      // PNG magic number: it is a real image, not an empty file.
      expect(bytes.subarray(1, 4).toString(), card).toBe('PNG')
      expect(bytes.length, `${card} is suspiciously small`).toBeGreaterThan(5000)
    }
  })

  it('emits a sitemap, robots.txt and both feeds', () => {
    for (const file of ['sitemap.xml', 'robots.txt', 'feed.json', 'feed.xml']) {
      expect(existsSync(join(DIST, file)), `missing ${file}`).toBe(true)
    }
  })

  it('points robots.txt at the sitemap on the deployed origin', () => {
    const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8')
    expect(robots).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m)
    expect(robots).toMatch(/^User-agent: GPTBot\nAllow: \/$/m)
    expect(robots).toMatch(/^User-agent: ClaudeBot\nAllow: \/$/m)
  })

  it('produces a valid JSON Feed with one entry per edition', () => {
    const feed = JSON.parse(readFileSync(join(DIST, 'feed.json'), 'utf8'))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(feed.title.length).toBeGreaterThan(0)
    expect(Array.isArray(feed.items)).toBe(true)

    const manifest = JSON.parse(readFileSync(join(ROOT, 'data/index.json'), 'utf8'))
    expect(feed.items).toHaveLength(manifest.runs.length)

    for (const item of feed.items) {
      expect(item.id).toMatch(/^https?:\/\//)
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.content_text).toMatch(/affirmative/)
      expect(Number.isNaN(Date.parse(item.date_published))).toBe(false)
    }
  })

  it('produces well-formed RSS with escaped content', () => {
    const rss = readFileSync(join(DIST, 'feed.xml'), 'utf8')
    expect(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(rss).toContain('<rss version="2.0"')
    expect(rss).toContain('</rss>')
    // Balanced item tags.
    expect((rss.match(/<item>/g) ?? []).length).toBe((rss.match(/<\/item>/g) ?? []).length)
    // Nothing unescaped leaked into an element body. Extract the bodies first:
    // an earlier version of this check matched the closing </description> tag
    // and would have failed on a perfectly well-formed feed.
    const bodies = [...rss.matchAll(/<(description|title)>([\s\S]*?)<\/\1>/g)].map((m) => m[2]!)
    expect(bodies.length).toBeGreaterThan(0)
    for (const body of bodies) {
      expect(body, `unescaped < or > in: ${body}`).not.toMatch(/[<>]/)
      expect(body, `unescaped & in: ${body}`).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/)
    }
  })
})

describe('the reports landing page', () => {
  const read = (path: string) => readFileSync(join(DIST, path, 'index.html'), 'utf8')
  // The page renders enabled questions only, and framing links only for the
  // framings the latest edition actually ran, so the test derives both the
  // same way rather than assuming names.
  const registry = JSON.parse(readFileSync(join(ROOT, 'questions.json'), 'utf8')) as {
    questions: Array<{ id: string; enabled?: boolean }>
  }
  const questionIds = registry.questions.filter((q) => q.enabled !== false).map((q) => q.id)
  const runFiles = readdirSync(join(ROOT, 'data/runs'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .reverse()
  const latest = runFiles[0]
    ? (JSON.parse(readFileSync(join(ROOT, 'data/runs', runFiles[0]), 'utf8')) as {
        conditions?: Array<{ id: string }>
        results: Array<{ questionId: string; conditionId: string }>
      })
    : null
  const framingsFor = (questionId: string) =>
    (latest?.conditions ?? [])
      .map((c) => c.id)
      .filter(
        (id) =>
          id !== 'control' &&
          latest!.results.some((r) => r.questionId === questionId && r.conditionId === id),
      )

  it('exists and links every full report, its framings, the PDF and the history', () => {
    const html = read('reports')
    for (const questionId of questionIds) {
      expect(html, `${questionId} full report`).toContain(`href="/reports/${questionId}/"`)
      for (const conditionId of framingsFor(questionId)) {
        expect(html, `${questionId} ${conditionId}`).toContain(
          `href="/reports/${questionId}/${conditionId}/"`,
        )
      }
      expect(html, `${questionId} pdf`).toContain(`href="/reports/${questionId}/report.pdf"`)
      expect(html, `${questionId} history`).toContain(`href="/history/${questionId}/"`)
    }
  })

  it('shows one card per question with a verdict, a tally and a framing fact', () => {
    const html = read('reports')
    expect((html.match(/class="issue"/g) ?? []).length).toBe(questionIds.length)
    expect((html.match(/class="verdict-word"/g) ?? []).length).toBeGreaterThan(0)
    expect(html).toMatch(/of \d+ models say|all \d+ models say/)
    expect(html).toMatch(/changed their minds?|nobody changed their mind/)
    expect(html).toMatch(/Week \d+, \d{4}/)
  })

  it('offers an ask-a-question form that works with scripts off and stays on site with them', () => {
    const html = read('reports')
    // A real label, a real form: the floor is a GET to the issue form with the
    // question in its text field, on the repository site.json names.
    expect(html).toMatch(/<label for="ask-text"[^>]*>Your question<\/label>/)
    expect(html).toMatch(
      /<form class="ask-form" method="get" action="https:\/\/github\.com\/[^/]+\/[^/"]+\/issues\/new"/,
    )
    expect(html).toMatch(/<input type="hidden" name="template" value="add_question\.yml"/)
    expect(html).toMatch(/<input id="ask-text" name="text" type="text" required/)
    expect(html).toContain('One word answer.')
    expect(html).toMatch(/issues\/new\?template=add_question\.yml"[^>]*data-ask-github/)
    expect(html).toMatch(/issues\/new\?template=add_model_or_provider\.yml/)
    // The shipped site configures the publisher's contact route.
    expect(html).toMatch(
      /href="https:\/\/endash\.us\/\?[^"]*contactMessage=[^"]*"[^>]*data-ask-contact/,
    )
    expect(html).toContain('Up next')
    // The home page points at it in one line rather than a third block.
    expect(read('')).toContain('href="/reports/#ask"')
  })

  it('renders no Up next section while nothing is proposed', () => {
    const html = read('reports')
    expect(html).not.toContain('id="up-next-heading"')
  })

  it('is where the home page hands off to', () => {
    const home = read('')
    expect(home).toContain('href="/reports/"')
    expect(home).not.toContain('class="tile"')
  })
})

/**
 * One archive, one switcher, and no page that points at where things used
 * to be. The reports index was once the home page and the history index was
 * once the archive; copy that still says so sends a reader to the wrong
 * place, and this is the check that stops it coming back.
 */
describe('navigation after the consolidation', () => {
  const read = (path: string) => readFileSync(join(DIST, path, 'index.html'), 'utf8')
  const mainNav = (html: string) =>
    html.match(/<ul class="nav-list"[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? ''

  it('has Editions in the primary nav and no History', () => {
    const nav = mainNav(read(''))
    expect(nav).toContain('>Editions<')
    expect(nav).not.toContain('>History<')
  })

  it('builds no history index: the editions page is the one archive', () => {
    expect(existsSync(join(DIST, 'history', 'index.html'))).toBe(false)
  })

  it('marks Editions current on the editions pages and on every week-by-week page', () => {
    const under = pages.filter((page) => /^\/(runs|history)\//.test(page.path))
    expect(under.length).toBeGreaterThan(1)
    for (const page of under) {
      const current = mainNav(page.html).match(
        /<a href="([^"]*)" aria-current="page"[^>]*>([^<]*)</,
      )
      expect(current?.[2]?.trim(), `${page.path} does not mark Editions current`).toBe('Editions')
    }
  })

  it('renders the question switcher on every report, arm and history page', () => {
    const targets = pages.filter((page) =>
      /^\/(reports\/[^/]+\/(?:[^/]+\/)?|history\/[^/]+\/)index\.html$/.test(page.path),
    )
    expect(targets.length).toBeGreaterThan(2)
    for (const page of targets) {
      expect(page.html, `${page.path} lacks the switcher`).toMatch(
        /<nav class="question-switcher[^"]*"[^>]*aria-label="Question"/,
      )
      expect(page.html, `${page.path} marks no question current`).toMatch(
        /question-switcher[\s\S]*?aria-current="page"/,
      )
    }
  })

  it('never links "the archive" or "home page" to somewhere the thing is not', () => {
    for (const page of pages) {
      for (const match of page.html.matchAll(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g)) {
        const [, href, text] = match
        const label = text!.trim().toLowerCase()
        if (/archive|editions/.test(label) && !/report/.test(label)) {
          expect(href, `${page.path}: "${text!.trim()}" links ${href}`).toMatch(/\/runs\/$/)
        }
        if (label === 'home page') {
          expect(href, `${page.path}: "home page" links ${href}`).toBe('/')
        }
      }
    }
  })

  it('says on every page when the next edition lands and how to subscribe', () => {
    for (const page of pages) {
      if (page.path === '/404.html') continue
      expect(page.html, `${page.path} lacks the next-edition line`).toMatch(
        /Next edition: [A-Z][a-z]+day, [A-Z][a-z]+ \d+\.|was due [A-Z][a-z]+day, [A-Z][a-z]+ \d+ and is running late/,
      )
      expect(page.html, `${page.path} lacks the RSS link`).toMatch(
        /<a href="[^"]*feed\.xml" type="application\/rss\+xml" rel="alternate"[^>]*>/,
      )
      expect(page.html, `${page.path} lacks the JSON feed link`).toMatch(
        /<a href="[^"]*feed\.json" type="application\/json" rel="alternate"[^>]*>/,
      )
    }
  })

  it('has exactly one dark call-to-action block on the home page', () => {
    const home = read('')
    expect(home).not.toContain('class="handoff"')
    expect((home.match(/class="fork"/g) ?? []).length).toBe(1)
    expect(home).toContain('class="handoff-line"')
  })
})
