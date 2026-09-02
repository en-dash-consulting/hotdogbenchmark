/**
 * The sitemap, built from the same page list as llms.txt.
 *
 * One file at /sitemap.xml rather than an index pointing at a second file:
 * the site has a few dozen pages, and the plain name is the one people and
 * tools try first. Each entry carries the date of the data behind it.
 */
import type { APIRoute } from 'astro'
import { sitePages } from '../lib/pages.ts'

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const entries = sitePages().map((page) => {
    const parts = [`<loc>${escape(new URL(page.path, origin).href)}</loc>`]
    if (page.lastmod) parts.push(`<lastmod>${page.lastmod}</lastmod>`)
    parts.push(`<changefreq>${page.changefreq}</changefreq>`)
    parts.push(`<priority>${page.priority.toFixed(1)}</priority>`)
    return `  <url>\n    ${parts.join('\n    ')}\n  </url>`
  })
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } })
}
