/**
 * robots.txt, generated so the sitemap URL always matches the deployed origin.
 *
 * Hardcoding it would silently point at the wrong host the moment the site
 * moves to a custom domain.
 */
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site ?? 'http://localhost:4321').href
  return new Response(['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
