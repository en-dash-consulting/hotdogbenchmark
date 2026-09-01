/**
 * Fails the build when the site ships more client JavaScript than it should.
 *
 * A budget nobody measures is a wish. This runs in seconds, unlike Lighthouse,
 * so a contributor who adds a framework finds out immediately rather than in
 * a CI job ten minutes later.
 *
 * Counts emitted script files and inline module scripts, gzipped, and excludes
 * the feature-flagged /run/ page whose bundle is opt-in.
 *
 * Usage: node scripts/js-budget.mjs [--budget-kb 30]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

/**
 * The budget, in KB.
 *
 * Parsed defensively: an earlier version used `argv[indexOf(flag) + 1]`, which
 * reads argv[0] — the node binary path — when the flag is absent, yielding NaN.
 * Every comparison against NaN is false, so the check silently passed no matter
 * how much JavaScript the site shipped. A budget that cannot fail is not a
 * budget.
 */
const flagIndex = process.argv.indexOf('--budget-kb')
const rawBudget = flagIndex === -1 ? undefined : process.argv[flagIndex + 1]
const BUDGET_KB = rawBudget === undefined ? 30 : Number(rawBudget)

if (!Number.isFinite(BUDGET_KB) || BUDGET_KB <= 0) {
  console.error(`Invalid --budget-kb value: ${rawBudget}`)
  process.exit(2)
}
const DIST = 'dist'

if (!existsSync(DIST)) {
  console.error('No dist/ directory. Run `npm run build` first.')
  process.exit(1)
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.name === '.prerender') return []
    return entry.isDirectory() ? walk(full) : [full]
  })

const files = walk(DIST)
const contributions = []

for (const file of files) {
  // The deferred Run Your Own page is opt-in and budgeted separately.
  if (relative(DIST, file).startsWith('run/')) continue

  if (file.endsWith('.js')) {
    contributions.push({
      what: relative(DIST, file),
      bytes: gzipSync(readFileSync(file)).length,
    })
    continue
  }

  if (file.endsWith('.html')) {
    const html = readFileSync(file, 'utf8')
    for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const body = match[1].trim()
      if (body.length === 0) continue
      contributions.push({
        what: `${relative(DIST, file)} (inline)`,
        bytes: gzipSync(Buffer.from(body)).length,
      })
    }
  }
}

// Inline scripts repeat on every page but are one payload per page load, so
// the budget is measured against the worst single page plus shared files.
const shared = contributions.filter((c) => !c.what.includes('(inline)'))
const inline = contributions.filter((c) => c.what.includes('(inline)'))
const worstInline = inline.length > 0 ? Math.max(...inline.map((c) => c.bytes)) : 0
const sharedTotal = shared.reduce((sum, c) => sum + c.bytes, 0)
const total = sharedTotal + worstInline

console.log('Client JavaScript, gzipped:\n')
for (const entry of [...shared].sort((a, b) => b.bytes - a.bytes).slice(0, 10)) {
  console.log(`  ${String(entry.bytes).padStart(7)} B  ${entry.what}`)
}
if (worstInline > 0) {
  console.log(`  ${String(worstInline).padStart(7)} B  worst single page's inline scripts`)
}

const budget = BUDGET_KB * 1024
console.log(
  `\nTotal ${total} B (${(total / 1024).toFixed(1)} KB) against a budget of ${BUDGET_KB} KB.`,
)

if (total > budget) {
  console.error(`\nOver budget by ${total - budget} B.`)
  process.exit(1)
}
console.log('Within budget.')
