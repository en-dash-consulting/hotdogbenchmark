/**
 * llms.txt: the site explained to an AI assistant, with every real page
 * listed, one line each.
 *
 * Generated from the same registries and runs the pages are built from, so it
 * cannot drift the way a hand-written one does. AI assistants are a real
 * referral channel, and a stale llms.txt that omits its own pages sends them
 * nowhere.
 */
import type { APIRoute } from 'astro'
import {
  getAllRuns,
  getConditionsRegistry,
  getLatestRun,
  getModels,
  getQuestions,
} from '../lib/data.ts'
import { formatEdition } from '../lib/format.ts'
import { treatedConditions } from '../lib/sensitivity.ts'
import { DEFAULT_SAMPLES } from '../../runner/run.ts'
import { REPO_URL } from '../lib/urls.ts'

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const url = (path: string) => new URL(path, origin).href

  const questions = getQuestions()
  const models = getModels()
  const conditions = getConditionsRegistry()
  const runs = getAllRuns()
  const latest = getLatestRun()

  const lines: string[] = []
  lines.push('# HOTDOG BENCHMARK')
  lines.push('')
  lines.push(
    `> Every week, ${models.length} large language models from ${new Set(models.map((m) => m.vendor)).size} vendors are asked "${questions[0]?.text ?? 'Is a hot dog a sandwich? One word answer.'}" and ${questions.length - 1} more questions like it, ${DEFAULT_SAMPLES} times each, under ${conditions.length} framings: asked plainly, told the answer is yes, told the answer is no. The site publishes exactly what they said, how long each took, what it cost, and how far each model's answer moved when it was told what to think. An En Dash Consulting research project, MIT licensed, with the raw JSON for every edition in the repository.`,
  )
  lines.push('')
  lines.push('## What is measured')
  lines.push('')
  lines.push(`- Questions: ${questions.map((q) => `"${q.text}"`).join('; ')}`)
  lines.push(
    `- Framings (conditions): ${conditions.map((c) => `${c.label} (${c.systemPrompt ? `system prompt "${c.systemPrompt}"` : 'no system prompt'})`).join('; ')}`,
  )
  lines.push(
    `- Models: ${models.map((m) => `${m.displayName} (${m.vendor}, ${m.modelId})`).join('; ')}`,
  )
  lines.push(
    `- Per call: the verbatim answer, a yes/no/other verdict, whether it was one word as asked, input/output/reasoning tokens, time to first answer token, total latency, and an estimated cost from a dated price table.`,
  )
  lines.push(
    '- Framing sensitivity: the share of questions on which a model changed its majority answer when a system prompt stated the answer as fact. Neither holding firm nor changing is graded as better.',
  )
  lines.push(
    '- Latency includes reasoning time; time to first answer token deliberately excludes reasoning tokens. Token counts are not comparable across vendors.',
  )
  if (latest) {
    lines.push('')
    lines.push('## Latest edition')
    lines.push('')
    lines.push(
      `- ${formatEdition(latest.isoWeek)}, published ${latest.finishedAt.slice(0, 10)}, ${latest.results.length} question-by-framing cells, ${treatedConditions(latest).length + 1} framings.`,
    )
    for (const question of questions) {
      const cell = latest.results.find(
        (r) => r.questionId === question.id && r.conditionId === 'control',
      )
      if (!cell) continue
      const tally = { yes: 0, no: 0, other: 0 }
      for (const model of cell.models)
        if (model.aggregate.verdict) tally[model.aggregate.verdict] += 1
      lines.push(
        `- ${question.subject}: ${tally.yes} yes, ${tally.no} no, ${tally.other} hedged. ${cell.models.map((m) => `${m.displayName}: ${m.samples[0]?.text.trim() ?? 'no answer'}`).join('; ')}`,
      )
    }
  }
  lines.push('')
  lines.push('## Pages')
  lines.push('')
  lines.push(
    `- [Home](${url('')}): the question, the models answering it in replayed real time, and the framing switch.`,
  )
  lines.push(
    `- [The reports](${url('reports/')}): one card per question with the latest verdict, who changed their mind, and links to the full report, both framings, and the PDF.`,
  )
  for (const question of questions) {
    lines.push(
      `- [${question.reportTitle}](${url(`reports/${question.id}/`)}): the full analyst report for ${question.subject}: verdicts, latency, tokens, cost, framing sensitivity, verbatim answers.`,
    )
    if (latest) {
      for (const condition of treatedConditions(latest)) {
        if (
          latest.results.some((r) => r.questionId === question.id && r.conditionId === condition.id)
        ) {
          lines.push(
            `- [${question.reportTitle}, ${condition.label.toLowerCase()} framing](${url(`reports/${question.id}/${condition.id}/`)}): the same report under the system prompt "${latest.results.find((r) => r.questionId === question.id && r.conditionId === condition.id)?.systemPrompt ?? ''}".`,
          )
        }
      }
    }
    lines.push(
      `- [${question.reportTitle}, week by week](${url(`history/${question.id}/`)}): how each model's answer has moved across editions, and sample consistency within the latest one.`,
    )
  }
  lines.push(`- [History](${url('history/')}): pick a question to see its trends.`)
  lines.push(`- [Every edition](${url('runs/')}): the archive, newest first.`)
  for (const run of runs) {
    lines.push(
      `- [${formatEdition(run.isoWeek)} edition](${url(`runs/${run.isoWeek}/`)}): every question asked that week, with the raw JSON at ${REPO_URL}/blob/main/data/runs/${run.isoWeek}.json.`,
    )
    for (const question of run.questions) {
      lines.push(
        `- [${formatEdition(run.isoWeek)}, ${question.id}](${url(`runs/${run.isoWeek}/${question.id}/`)}): that week's archived report for ${question.id}.`,
      )
    }
  }
  lines.push(
    `- [How it is measured](${url('methodology/')}): questions, framings, sampling, what latency and tokens mean, the constructed scores, and what this does not measure.`,
  )
  lines.push(
    `- [How it works](${url('how-it-works/')}): the pipeline, with code excerpted from the repository.`,
  )
  lines.push(`- [Add a model](${url('add-a-model/')}): how to add a model or provider.`)
  lines.push(`- [About](${url('about/')}): who makes this and why.`)
  lines.push(
    `- [Accessibility](${url('accessibility/')}): the target, what is checked, and how to report a problem.`,
  )
  lines.push(
    `- [JSON feed](${url('feed.json')}) and [RSS](${url('feed.xml')}): one entry per edition.`,
  )
  lines.push('')
  lines.push(`Everything on the site in one plain-text file: ${url('llms-full.txt')}`)
  lines.push(`Source, data, and license: ${REPO_URL}`)
  lines.push('')

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
