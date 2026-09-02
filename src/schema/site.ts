/**
 * The site registry — `site.json` at the repository root.
 *
 * Who publishes this, what it is called, and where its code lives. Every
 * place the site names itself reads this file, so a fork about burritos is
 * the Burrito Benchmark by whoever forked it, not the Hotdog Benchmark by En
 * Dash with a front page pointing at the upstream repository. `bench init`
 * writes it alongside the other registries.
 *
 * Loading from disk lives in `src/data/registries.ts`. This module stays pure
 * so the same validation can run anywhere.
 */
import { z } from 'zod'

const link = z.object({
  label: z.string().min(1),
  href: z.string().url(),
})

/**
 * An optional contact route: a page on the publisher's site that opens a
 * contact form from query parameters, with the visitor's question in the
 * message field. En Dash has one; most forks will not, and null is the
 * default.
 */
export const contactRouteSchema = z.object({
  /** The page that opens the form. */
  url: z.string().url(),
  /** Query parameters always sent, e.g. { showContact: "true", contactSource: "hotdogbenchmark-lol" }. */
  params: z.record(z.string(), z.string()),
  /** The query parameter that carries the visitor's message. */
  messageField: z.string().min(1),
  /** The query parameter that carries the form's heading, and the heading itself. */
  titleField: z.string().min(1),
  title: z.string().min(1),
})
export type ContactRoute = z.infer<typeof contactRouteSchema>

export const siteRegistrySchema = z.object({
  $schema: z.string().optional(),
  /** "Hotdog Benchmark". Titles and feeds use it in capitals. */
  name: z.string().min(1),
  /** The wordmark's lines, one to three: ["Hotdog", "Benchmark"]. */
  wordmark: z.array(z.string().min(1)).min(1).max(3),
  /** Twelve characters or fewer, for a home-screen icon. */
  shortName: z.string().min(1).max(12),
  /** Follows the name on a report's "prepared by" line: "an En Dash research program". */
  byline: z.string().min(1),
  /** The organization behind the site. */
  publisher: z.object({ name: z.string().min(1), url: z.string().url() }),
  /** The GitHub repository the site is built from; issue and source links derive from it. */
  repository: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\/[^/]+\/[^/]+$/, 'repository must be a GitHub repository URL'),
  /** The mark in the masthead and the favicon, under public/. */
  mark: z.object({ src: z.string().min(1), alt: z.string().min(1) }),
  /** One sentence for the footer: what this is, in the publisher's voice. */
  footerNote: z.string().min(1),
  /** Tools or people to credit in the footer, e.g. "Built with n-dx". */
  credits: z.array(link.extend({ description: z.string().min(1).optional() })).default([]),
  /** A footer line to the publisher's other work, or null. */
  more: z
    .object({ lead: z.string().min(1), links: z.array(link).min(1) })
    .nullable()
    .default(null),
  /** Where "ask a question" can also go, or null for the GitHub route alone. */
  contact: contactRouteSchema.nullable().default(null),
})
export type SiteRegistry = z.infer<typeof siteRegistrySchema>

/** Validate a parsed `site.json`, throwing a message that names the file. */
export function parseSiteRegistry(input: unknown, label = 'site.json'): SiteRegistry {
  const result = siteRegistrySchema.safeParse(input)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  /${issue.path.join('/')}: ${issue.message}`)
      .sort()
      .join('\n')
    throw new Error(`${label} is not a valid site registry:\n${detail}`)
  }
  return result.data
}

/** The name as titles, feeds and structured data print it: "HOTDOG BENCHMARK". */
export function siteNameCaps(site: Pick<SiteRegistry, 'name'>): string {
  return site.name.toUpperCase()
}

/** "Hotdog Benchmark, an En Dash research program": the report masthead's byline. */
export function preparedBy(site: Pick<SiteRegistry, 'name' | 'byline'>): string {
  return `${site.name}, ${site.byline}`
}

/**
 * The site registry a fork starts from when `bench init` finds none to keep:
 * named after the question, published by nobody in particular, pointing at
 * the fork's own repository.
 */
export function defaultSiteRegistry(options: {
  subject: string
  repository: string
}): SiteRegistry {
  const noun = options.subject.trim().replace(/^(a|an|the)\s+/i, '')
  const words = noun
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  const name = `${words.join(' ')} Benchmark`
  return siteRegistrySchema.parse({
    name,
    wordmark: [words.join(' '), 'Benchmark'],
    shortName: name.length <= 12 ? name : words.join(' ').slice(0, 12),
    byline: 'an independent benchmark',
    publisher: { name: 'The maintainers', url: options.repository },
    repository: options.repository,
    mark: { src: 'brand/mark.svg', alt: name },
    footerNote:
      'A research program of no consequence whatsoever, published weekly. The question is silly on purpose; the measurement is not.',
    credits: [],
    more: null,
    contact: null,
  })
}
