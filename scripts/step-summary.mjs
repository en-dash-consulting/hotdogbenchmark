/**
 * Writes the GitHub Actions job summary for a benchmark run: the yes/no/other
 * tally per question and a per-model status table.
 *
 * This is what someone sees when they open the workflow run, so it is written
 * for a human skimming rather than for a log parser.
 */
import { loadAllRuns } from '../src/data/index.ts'

const runs = loadAllRuns().map((file) => file.run)
const latest = runs[0]

if (!latest) {
  console.log('## Benchmark run\n\nNo run file was produced.')
  process.exit(0)
}

console.log(`## Benchmark run — ${latest.isoWeek}`)
console.log('')
console.log(
  `Run ID \`${latest.runId}\` · ${latest.questions.length} questions · started ${latest.startedAt}`,
)
if (latest.isMock) console.log('\n> **Mock run.** Replayed from recorded fixtures.')
console.log('')

for (const result of latest.results) {
  const question = latest.questions.find((q) => q.id === result.questionId)
  console.log(`### ${result.questionId}`)
  console.log('')
  console.log(`> ${question?.text ?? ''}`)
  console.log('')

  const tally = { yes: 0, no: 0, other: 0 }
  let errors = 0
  for (const model of result.models) {
    if (model.status === 'error') errors += 1
    else if (model.aggregate.verdict) tally[model.aggregate.verdict] += 1
  }

  console.log(
    `**${tally.yes} affirmative · ${tally.no} negative · ${tally.other} non-committal**` +
      (errors > 0 ? ` · ${errors} unavailable` : ''),
  )
  console.log('')
  console.log('| Model | Status | Verdict | Median latency | Output tokens | Answer |')
  console.log('| --- | --- | --- | --- | --- | --- |')

  for (const model of result.models) {
    if (model.status === 'error') {
      console.log(
        `| ${model.displayName} | \`error\` | — | — | — | ${model.error?.category ?? 'unknown'}: ${(model.error?.message ?? '').slice(0, 80)} |`,
      )
      continue
    }
    const latency = model.aggregate.totalMs
      ? `${Math.round(model.aggregate.totalMs.median)} ms`
      : '—'
    const tokens = model.aggregate.outputTokens
      ? Math.round(model.aggregate.outputTokens.median)
      : '—'
    const answer = (model.samples[0]?.text ?? '').replace(/\s+/g, ' ').slice(0, 60)
    console.log(
      `| ${model.displayName} | \`${model.status}\` | ${model.aggregate.verdict ?? '—'} | ${latency} | ${tokens} | ${answer} |`,
    )
  }
  console.log('')
}
