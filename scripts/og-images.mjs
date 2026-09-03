/**
 * Generates one OpenGraph card per page that has something of its own to say.
 *
 * Rendered by screenshotting a small HTML document in Chromium, which is
 * already a dependency for the accessibility checks and the PDF edition.
 * Reaching for satori or resvg here would add a rendering engine whose output
 * differs from the one the rest of the pipeline already uses.
 *
 * Cards, all under `<out>/og/`:
 *
 *   default.png                       the site: the lead question and the promise
 *   <questionId>.png                  one report: title, edition, control tally
 *   <questionId>-<conditionId>.png    one framed report: the system prompt and its tally
 *   runs/<editionKey>.png             one edition: date and a verdict per question
 *
 * The data comes from the run files themselves (`data/runs/*.json`, schema
 * version 2), not from the manifest, so a card can never be a week behind the
 * file it describes. The output directory follows `ASTRO_OUT_DIR` the way the
 * site build does, so a test can render into its own directory.
 *
 * Usage: node scripts/og-images.mjs
 */
import { readFileSync } from 'node:fs'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT = join(process.env.ASTRO_OUT_DIR || 'dist', 'og')
const CONTROL = 'control'

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

/** Every committed run, newest first. Non-run files in the directory are skipped. */
async function loadRuns() {
  let names
  try {
    names = await readdir('data/runs')
  } catch {
    return []
  }
  const runs = []
  for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
    const run = await readJson(join('data/runs', name), null)
    if (run && Array.isArray(run.results) && typeof run.isoWeek === 'string') {
      runs.push(run)
    }
  }
  return runs.sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
}

const runs = await loadRuns()
const questions = (await readJson('questions.json', { questions: [] })).questions.filter(
  (q) => q.enabled,
)
/** The site's own name, from site.json; the cards say whose they are. */
const site = await readJson('site.json', { name: 'Benchmark' })
const KICKER = site.name
const models = (await readJson('models.json', { models: [] })).models.filter((m) => m.enabled)
const latest = runs[0] ?? null

/** Escape text for the card. Model names and prompts are data, not markup. */
const esc = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** `2026-W36` reads as "Week 36, 2026"; a daily key as its date. */
function editionLabel(run) {
  const key = run.editionKey ?? run.isoWeek
  const week = /^(\d{4})-W(\d{2})$/.exec(key)
  if (week) return `Week ${Number(week[2])}, ${week[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDate(`${key}T00:00:00Z`)
  return key
}

function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const VERDICT_LABEL = { yes: 'Yes', no: 'No', other: 'Non-committal' }

/** The majority position in one cell of the matrix, as a label and a count. */
function consensusFor(run, questionId, conditionId = CONTROL) {
  if (!run) return null
  const cell = run.results.find(
    (r) => r.questionId === questionId && (r.conditionId ?? CONTROL) === conditionId,
  )
  if (!cell) return null
  const tally = { yes: 0, no: 0, other: 0 }
  let answering = 0
  for (const model of cell.models) {
    if (model.status === 'error' || !model.aggregate?.verdict) continue
    tally[model.aggregate.verdict] += 1
    answering += 1
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const [top, next] = entries
  if (!top || top[1] === 0) return null
  if (next && next[1] === top[1]) {
    return { label: 'No consensus', detail: `${answering} models evaluated`, verdict: null }
  }
  return {
    label: VERDICT_LABEL[top[0]],
    detail: `${top[1]} of ${answering} models`,
    verdict: top[0],
    top: top[1],
    answering,
  }
}

/** The system prompt actually sent in one cell, or null. */
function systemPromptFor(run, questionId, conditionId) {
  const cell = run.results.find(
    (r) => r.questionId === questionId && (r.conditionId ?? CONTROL) === conditionId,
  )
  return cell?.systemPrompt ?? null
}

const subjectName = (question) => {
  const bare = question.subject.replace(/^(an?|the)\s+/i, '')
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

const headline = (question) => question.text.replace(/\s*One word answer\.$/, '')

/**
 * The card, as a self-contained document. Navy ground, teal rule, the site's
 * display face when the machine has it and a serif fallback when it does not.
 */
/** The En Dash square, inlined so the card needs no network. */
const LOGO = readFileSync(new URL('../public/brand/endash-square.svg', import.meta.url), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
  .replace('<svg ', '<svg class="logo" ')

function card({ kicker, title, quote, lines, edition, verdict, detail, titleSize = 76 }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body {
      width: 1200px; height: 630px; display: flex; flex-direction: column;
      justify-content: space-between; padding: 60px 72px;
      background: linear-gradient(135deg, #000b45 0%, #001769 100%); color: #ffffff;
      font-family: Montserrat, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
    .kicker { font-size: 22px; letter-spacing: .16em; text-transform: uppercase; color: #7bffea; font-weight: 700; }
    .logo { width: 64px; height: 64px; flex: none; }
    .rule { height: 4px; background: linear-gradient(90deg, #7bffea 0%, #1fd5c0 100%); margin: 18px 0 36px; }
    h1 {
      font-family: Montserrat, Georgia, "Times New Roman", serif; font-size: ${titleSize}px; line-height: 1.04;
      letter-spacing: -.02em; max-width: 20ch; font-weight: 800;
    }
    .quote {
      margin-top: 28px; padding-left: 24px; border-left: 4px solid #7bffea;
      font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: 34px; color: #d5d9ee;
      max-width: 28ch;
    }
    .lines { margin-top: 28px; display: grid; gap: 10px; }
    .line { font-size: 30px; color: #d5d9ee; }
    .line b { color: #ffffff; font-weight: 800; }
    .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
    .meta { font-size: 26px; color: #d5d9ee; }
    .verdict { text-align: right; }
    .verdict-label { font-size: 46px; color: #7bffea; font-weight: 800; }
    .verdict-detail { font-size: 24px; color: #d5d9ee; margin-top: 6px; }
  </style></head><body>
    <div>
      <div class="head">
        <p class="kicker">${esc(kicker)}</p>
        ${LOGO}
      </div>
      <div class="rule"></div>
      <h1>${esc(title)}</h1>
      ${quote ? `<p class="quote">&ldquo;${esc(quote)}&rdquo;</p>` : ''}
      ${
        lines?.length
          ? `<div class="lines">${lines.map((line) => `<p class="line">${line}</p>`).join('')}</div>`
          : ''
      }
    </div>
    <div class="foot">
      <p class="meta">${esc(edition)}</p>
      ${verdict ? `<div class="verdict"><div class="verdict-label">${esc(verdict)}</div><div class="verdict-detail">${esc(detail)}</div></div>` : ''}
    </div>
  </body></html>`
}

const edition = latest ? editionLabel(latest) : 'No edition published'
const first = questions[0]

const cards = [
  {
    name: 'default',
    html: card({
      kicker: KICKER,
      title: first ? headline(first) : 'Independent cross-vendor AI research',
      lines: [
        `<b>${models.length} AI models</b> answer, every week.`,
        'Then they are told the answer, and some of them believe it.',
      ],
      edition,
      verdict: first ? consensusFor(latest, first.id)?.label : null,
      detail: first ? consensusFor(latest, first.id)?.detail : '',
    }),
  },
  ...questions.map((question) => {
    const consensus = consensusFor(latest, question.id)
    const credited = question.contributor?.credit ? question.contributor.name : null
    return {
      name: question.id,
      html: card({
        kicker: KICKER,
        title: question.reportTitle,
        quote: headline(question),
        lines: credited ? [`Sent in by ${esc(credited)}`] : undefined,
        edition,
        verdict: consensus?.label ?? null,
        detail: consensus?.detail ?? '',
      }),
    }
  }),
]

// The reports landing page: every question with its latest verdict. Rendered
// even without an edition, because the page always references it.
{
  cards.push({
    name: 'reports',
    html: card({
      kicker: `${KICKER} · The reports`,
      title: 'The full reports',
      lines: questions.map((question) => {
        const consensus = consensusFor(latest, question.id)
        return `${esc(headline(question))} <b>${consensus ? esc(consensus.label) : 'no answers'}</b>`
      }),
      edition,
      verdict: null,
      titleSize: 64,
    }),
  })
}

// One card per framed report in the latest edition, showing the prompt that framed it.
if (latest) {
  for (const condition of latest.conditions ?? []) {
    if (condition.id === CONTROL) continue
    for (const question of questions) {
      const consensus = consensusFor(latest, question.id, condition.id)
      if (!consensus) continue
      cards.push({
        name: `${question.id}-${condition.id}`,
        html: card({
          kicker: `${KICKER} · ${condition.label} framing`,
          title: question.reportTitle,
          quote: systemPromptFor(latest, question.id, condition.id) ?? condition.label,
          edition,
          verdict: consensus.label,
          detail: consensus.detail,
          titleSize: 64,
        }),
      })
    }
  }
}

// One card per edition, with a verdict per question.
for (const run of runs) {
  const lines = run.questions.map((asked) => {
    const question = questions.find((q) => q.id === asked.id)
    const name = question ? subjectName(question) : asked.id
    const consensus = consensusFor(run, asked.id)
    const verdict = consensus
      ? `<b>${esc(consensus.label)}</b>, ${esc(consensus.detail)}`
      : 'no answers'
    return `${esc(name)}: ${verdict}`
  })
  const modelCount = new Set(
    run.results.flatMap((cell) => cell.models.map((m) => `${m.provider}/${m.modelId}`)),
  ).size
  cards.push({
    name: `runs/${run.editionKey ?? run.isoWeek}`,
    html: card({
      kicker: `${KICKER} · Edition`,
      title: `${editionLabel(run)} edition`,
      lines,
      edition: `${formatDate(run.finishedAt)} · ${modelCount} models · ${(run.conditions ?? []).length || 1} framings`,
      verdict: null,
      titleSize: 64,
    }),
  })
}

await mkdir(join(OUT, 'runs'), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

for (const { name, html } of cards) {
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({ path: join(OUT, `${name}.png`), type: 'png' })
  console.log(`  og/${name}.png`)
}

await browser.close()
console.log(`OpenGraph cards: ${cards.length} rendered for ${edition}.`)
