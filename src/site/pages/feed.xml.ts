/**
 * RSS of weekly editions, for readers that do not speak JSON Feed.
 */
import type { APIRoute } from 'astro'
import { getAllRuns, getModelResults, getQuestion } from '../lib/data.ts'
import { formatEdition } from '../lib/format.ts'

/** XML text escaping. Titles and summaries are generated, but not trusted. */
const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const url = (path: string) => new URL(path, origin).href
  const runs = getAllRuns()

  const items = runs
    .map((run) => {
      const summary = run.questions
        .map((asked) => {
          const tally = { yes: 0, no: 0, other: 0 }
          for (const model of getModelResults(run, asked.id)) {
            if (model.aggregate.verdict) tally[model.aggregate.verdict] += 1
          }
          const subject = getQuestion(asked.id)?.subject ?? asked.id
          return `${subject}: ${tally.yes} affirmative, ${tally.no} negative, ${tally.other} non-committal`
        })
        .join('; ')

      return [
        '    <item>',
        `      <title>${escape(formatEdition(run.isoWeek))} edition</title>`,
        `      <link>${escape(url(`runs/${run.isoWeek}/`))}</link>`,
        `      <guid isPermaLink="true">${escape(url(`runs/${run.isoWeek}/`))}</guid>`,
        `      <pubDate>${new Date(run.finishedAt).toUTCString()}</pubDate>`,
        `      <description>${escape(summary)}</description>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>HOTDOG BENCHMARK</title>',
    `    <link>${escape(url(''))}</link>`,
    '    <description>Weekly cross-vendor evaluation of contested sandwich classification.</description>',
    '    <language>en</language>',
    `    <atom:link href="${escape(url('feed.xml'))}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')

  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
