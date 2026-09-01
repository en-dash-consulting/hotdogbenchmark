/**
 * JSON Feed of weekly editions.
 *
 * One entry per edition, with the per-question tallies in the summary so a
 * subscriber sees the result without opening the page.
 */
import type { APIRoute } from 'astro'
import { getAllRuns, getModelResults, getQuestion } from '../lib/data.ts'
import { formatEdition } from '../lib/format.ts'
import { consensusOf } from '../lib/prose.ts'

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const url = (path: string) => new URL(path, origin).href

  const items = getAllRuns().map((run) => {
    const lines = run.questions.map((asked) => {
      const results = getModelResults(run, asked.id)
      const consensus = consensusOf(results)
      const tally = { yes: 0, no: 0, other: 0 }
      for (const model of results) {
        if (model.aggregate.verdict) tally[model.aggregate.verdict] += 1
      }
      const title = getQuestion(asked.id)?.subject ?? asked.id
      return `${title}: ${tally.yes} affirmative, ${tally.no} negative, ${tally.other} non-committal${
        consensus.unanimous ? ' (unanimous)' : ''
      }`
    })

    return {
      id: url(`runs/${run.isoWeek}/`),
      url: url(`runs/${run.isoWeek}/`),
      title: `${formatEdition(run.isoWeek)} edition`,
      content_text: lines.join('\n'),
      date_published: run.finishedAt,
      tags: run.questions.map((q) => q.id),
    }
  })

  return new Response(
    JSON.stringify(
      {
        version: 'https://jsonfeed.org/version/1.1',
        title: 'Sandwich Classification Benchmark',
        home_page_url: url(''),
        feed_url: url('feed.json'),
        description: 'Weekly cross-vendor evaluation of contested sandwich classification.',
        language: 'en',
        items,
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/feed+json; charset=utf-8' } },
  )
}
