/**
 * robots.txt, generated so the sitemap URL always matches the deployed origin.
 *
 * Hardcoding it would silently point at the wrong host the moment the site
 * moves to a custom domain. Everything is allowed, and the AI crawlers are
 * named so the permission is explicit rather than a default: the benchmark
 * exists to be read, quoted and cited, by people and by assistants.
 */
import type { APIRoute } from 'astro'

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
]

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321')
  const lines = ['User-agent: *', 'Allow: /', '']
  for (const agent of AI_CRAWLERS) lines.push(`User-agent: ${agent}`, 'Allow: /', '')
  lines.push(`Sitemap: ${new URL('sitemap.xml', origin).href}`, '')
  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
