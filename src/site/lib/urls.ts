/**
 * Internal links.
 *
 * GitHub Pages serves this site under `/<repo>/`, so a hand-written `/runs/`
 * works locally and 404s in production. Every internal href goes through
 * `href()`, which prefixes Astro's configured base.
 *
 * The failure mode this prevents is nasty precisely because it is invisible
 * until deployment, so there is a build test asserting no page contains a
 * hardcoded root-relative link.
 */

import { loadSiteRegistry, REPO_ROOT } from '../../data/registries.ts'

/** Astro's configured base path, always with a trailing slash. */
const BASE: string = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

/** Prefix an internal path with the deployment base. Pass paths without a leading slash. */
export function href(path = ''): string {
  const clean = path.replace(/^\/+/, '')
  return `${BASE}${clean}`
}

export const routes = {
  home: () => href(),
  about: () => href('about/'),
  accessibility: () => href('accessibility/'),
  methodology: () => href('methodology/'),
  howItWorks: () => href('how-it-works/'),
  addAModel: () => href('add-a-model/'),
  historyForQuestion: (questionId: string) => href(`history/${questionId}/`),
  runs: () => href('runs/'),
  reports: () => href('reports/'),
  report: (questionId: string) => href(`reports/${questionId}/`),
  reportCondition: (questionId: string, conditionId: string) =>
    href(`reports/${questionId}/${conditionId}/`),
  run: (isoWeek: string) => href(`runs/${isoWeek}/`),
  runQuestion: (isoWeek: string, questionId: string) => href(`runs/${isoWeek}/${questionId}/`),
  runYourOwn: () => href('run/'),
  feedJson: () => href('feed.json'),
  feedRss: () => href('feed.xml'),
  reportPdf: (questionId: string) => href(`reports/${questionId}/report.pdf`),
}

/**
 * Whether the deferred "run your own benchmark" page is emitted.
 *
 * Off by default. When off the page is not built at all and no nav entry
 * appears — not hidden with CSS, absent from `dist/`.
 */
export const RUN_YOUR_OWN_ENABLED: boolean =
  import.meta.env.RUN_YOUR_OWN_ENABLED === 'true' ||
  import.meta.env.PUBLIC_RUN_YOUR_OWN_ENABLED === 'true'

/**
 * The in-page anchor of a vendor's profile card, so a chart mark can link to
 * the evidence for the number it plots.
 */
export function profileAnchor(model: { provider: string; modelId: string }): string {
  return `profile-${model.provider}-${model.modelId}`.replace(/[^a-zA-Z0-9-]/g, '-')
}

/** The GitHub repository this site is built from, from site.json. */
export const REPO_URL: string = loadSiteRegistry(REPO_ROOT).repository

/** Deep link to a source file, so the site can point at the code it describes. */
export function sourceUrl(path: string, ref = 'main'): string {
  return `${REPO_URL}/blob/${ref}/${path}`
}
