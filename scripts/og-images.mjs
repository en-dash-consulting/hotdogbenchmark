/**
 * Generates an OpenGraph card per report, plus a site-wide default.
 *
 * Rendered by screenshotting a small HTML document in Chromium, which is
 * already a dependency for the accessibility checks and the PDF edition.
 * Reaching for satori or resvg here would add a rendering engine whose output
 * differs from the one the rest of the pipeline already uses.
 *
 * The card is styled as a report cover: wordmark, report title, edition, and
 * the consensus figure. No imagery, consistent with everything else.
 *
 * Usage: node scripts/og-images.mjs
 */
import { readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT = 'dist/og'

const read = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

const manifest = await read('data/index.json', { runs: [] })
const questions = (await read('questions.json', { questions: [] })).questions.filter(
  (q) => q.enabled,
)
const latest = manifest.runs?.[0]

/** Per-question consensus for the latest edition, read from the run file. */
let run = null
if (latest) run = await read(latest.path, null)

function consensusFor(questionId) {
  if (!run) return null
  const result = run.results.find((r) => r.questionId === questionId)
  if (!result) return null
  const tally = { yes: 0, no: 0, other: 0 }
  let answering = 0
  for (const model of result.models) {
    if (model.status === 'error' || !model.aggregate.verdict) continue
    tally[model.aggregate.verdict] += 1
    answering += 1
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const [top, next] = entries
  if (!top || top[1] === 0) return null
  if (next && next[1] === top[1])
    return { label: 'No consensus', detail: `${answering} models evaluated` }
  const label = top[0] === 'yes' ? 'Affirmative' : top[0] === 'no' ? 'Negative' : 'Non-committal'
  return { label, detail: `${top[1]} of ${answering} models` }
}

const editionLabel = latest
  ? `Week ${Number(latest.isoWeek.slice(6))}, ${latest.isoWeek.slice(0, 4)}`
  : 'No edition published'

/** The card, as a self-contained document. Fonts are system faces only. */
function card({ title, edition, verdict, detail }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body {
      width: 1200px; height: 630px; display: flex; flex-direction: column;
      justify-content: space-between; padding: 64px 72px;
      background: #f7f8fa; color: #141922;
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .kicker { font-size: 22px; letter-spacing: .16em; text-transform: uppercase; color: #4d5768; }
    .rule { border-top: 6px solid #0b1a2b; border-bottom: 1px solid #0b1a2b; height: 6px; margin: 20px 0 40px; }
    h1 {
      font-family: Georgia, "Times New Roman", serif; font-size: 76px; line-height: 1.06;
      color: #0b1a2b; letter-spacing: -.02em; max-width: 20ch;
    }
    .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
    .meta { font-size: 26px; color: #4d5768; }
    .verdict { text-align: right; }
    .verdict-label {
      font-family: Georgia, serif; font-size: 46px; color: #0b1a2b; font-weight: 700;
    }
    .verdict-detail { font-size: 24px; color: #4d5768; margin-top: 6px; }
  </style></head><body>
    <div>
      <p class="kicker">Hotdog Benchmark</p>
      <div class="rule"></div>
      <h1>${title}</h1>
    </div>
    <div class="foot">
      <p class="meta">${edition}</p>
      ${verdict ? `<div class="verdict"><div class="verdict-label">${verdict}</div><div class="verdict-detail">${detail}</div></div>` : ''}
    </div>
  </body></html>`
}

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

const cards = [
  {
    name: 'default',
    html: card({
      title: 'Independent cross-vendor AI research',
      edition: editionLabel,
      verdict: null,
    }),
  },
  ...questions.map((question) => {
    const consensus = consensusFor(question.id)
    return {
      name: question.id,
      html: card({
        title: question.reportTitle,
        edition: editionLabel,
        verdict: consensus?.label ?? null,
        detail: consensus?.detail ?? '',
      }),
    }
  }),
]

for (const { name, html } of cards) {
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({ path: join(OUT, `${name}.png`), type: 'png' })
  console.log(`  og/${name}.png`)
}

await browser.close()
console.log(`OpenGraph cards: ${cards.length} rendered.`)
