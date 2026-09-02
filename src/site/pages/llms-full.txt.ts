/**
 * llms-full.txt: the whole site's substance in one plain-text file.
 *
 * llms.txt is the map; this is the territory. An assistant that fetches one
 * file gets every question, every model's verbatim answer under every
 * framing, the tallies, and the executive summary of each report, built from
 * the same data the pages are, so it cannot drift from what the site says.
 */
import type { APIRoute } from 'astro'
import { CONTROL_CONDITION_ID } from '../../schema/conditions.ts'
import { getAllRuns, getLatestRun, getModels, getQuestions } from '../lib/data.ts'
import { formatDate, formatDuration, formatEdition } from '../lib/format.ts'
import { executiveSummary, keyFindings, questionHeadline } from '../lib/prose.ts'
import { flippedNames, tallyPhrase } from '../lib/seo.ts'
import { treatedConditions } from '../lib/sensitivity.ts'
import { REPO_URL } from '../lib/urls.ts'

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const url = (path: string) => new URL(path, origin).href
  const questions = getQuestions()
  const models = getModels()
  const latest = getLatestRun()
  const runs = getAllRuns()
  const lines: string[] = []

  lines.push('# HOTDOG BENCHMARK, in full')
  lines.push('')
  lines.push(
    `Every week ${models.length} AI models are asked "${questions[0]?.text ?? 'Is a hot dog a sandwich? One word answer.'}" and similar questions, under three framings: asked plainly, told the answer is yes, told the answer is no. This file carries every answer from the latest edition. The site is ${url('')}; the map of its pages is ${url('llms.txt')}; the raw JSON and the code are at ${REPO_URL} (MIT).`,
  )

  if (!latest) {
    lines.push('', 'No edition has been published yet.', '')
    return new Response(lines.join('\n'), {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  lines.push('')
  lines.push(
    `Latest edition: ${formatEdition(latest.isoWeek)}, published ${formatDate(latest.finishedAt)}. ${runs.length} edition${runs.length === 1 ? '' : 's'} so far. Latency figures are median total time per call including any reasoning; costs are estimates from a dated price table.`,
  )

  for (const question of questions) {
    const control = latest.results.find(
      (cell) => cell.questionId === question.id && cell.conditionId === CONTROL_CONDITION_ID,
    )
    if (!control) continue
    lines.push('', `## ${questionHeadline(question)}`, '')
    lines.push(`Report: ${url(`reports/${question.id}/`)}`)
    lines.push(`Asked as: "${control.prompt ?? question.text}"`)
    lines.push('')
    lines.push(`Verdict: ${tallyPhrase(control.models)}.`)
    const flipped = flippedNames(latest, question.id)
    lines.push(
      flipped.length === 0
        ? 'Told the answer, nobody changed their mind.'
        : `Told the answer, ${flipped.join(', ')} changed their mind.`,
    )
    lines.push('')
    lines.push(executiveSummary({ subject: question.subject, results: control.models }))
    lines.push('')
    lines.push('Findings:')
    for (const finding of keyFindings({ subject: question.subject, results: control.models })) {
      lines.push(`- ${finding.label}: ${finding.text}`)
    }
    lines.push('', '### Every answer, asked plainly', '')
    for (const model of control.models) {
      const answers = model.samples.map((sample) => `"${sample.text.trim()}"`).join(', ')
      lines.push(
        `- ${model.displayName} (${model.provider}): ${answers || 'no answer'}; verdict ${model.aggregate.verdict ?? 'none'}; median ${formatDuration(model.aggregate.totalMs?.median)}.`,
      )
    }
    for (const condition of treatedConditions(latest)) {
      const cell = latest.results.find(
        (c) => c.questionId === question.id && c.conditionId === condition.id,
      )
      if (!cell) continue
      lines.push('', `### Every answer under the ${condition.label.toLowerCase()} framing`, '')
      lines.push(`System prompt: "${cell.systemPrompt ?? ''}". ${tallyPhrase(cell.models)}.`)
      lines.push('')
      for (const model of cell.models) {
        const answers = model.samples.map((sample) => `"${sample.text.trim()}"`).join(', ')
        lines.push(
          `- ${model.displayName}: ${answers || 'no answer'}; verdict ${model.aggregate.verdict ?? 'none'}.`,
        )
      }
    }
  }

  lines.push('', '## Models', '')
  for (const model of models) {
    lines.push(`- ${model.displayName}: ${model.vendor}, model id ${model.modelId}.`)
  }
  lines.push('', `Source, data, and license: ${REPO_URL}`, '')
  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
