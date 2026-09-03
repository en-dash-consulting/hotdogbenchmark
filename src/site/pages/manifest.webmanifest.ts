/**
 * The web app manifest, from site.json rather than a hand-kept file, so a
 * fork's home-screen icon carries the fork's name.
 */
import type { APIRoute } from 'astro'
import { getQuestions, getSite } from '../lib/data.ts'
import { feedDescription } from '../lib/prose.ts'
import { siteNameCaps } from '../../schema/site.ts'
import { href } from '../lib/urls.ts'

export const GET: APIRoute = () => {
  const site = getSite()
  const manifest = {
    name: siteNameCaps(site),
    short_name: site.shortName,
    description: feedDescription(getQuestions()),
    start_url: href(),
    scope: href(),
    display: 'minimal-ui',
    background_color: '#ffffff',
    theme_color: '#001769',
    icons: [
      { src: href('apple-touch-icon.png'), sizes: '180x180', type: 'image/png' },
      { src: href('pwa-icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
  }
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  })
}
