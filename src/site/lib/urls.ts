/**
 * Internal links.
 *
 * GitHub Pages serves this site under `/<repo>/`, so a hand-written `/history/`
 * works locally and 404s in production. Every internal href goes through
 * `href()`, which prefixes Astro's configured base.
 *
 * The failure mode this prevents is nasty precisely because it is invisible
 * until deployment, so there is a build test asserting no page contains a
 * hardcoded root-relative link.
 */

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
  methodology: () => href('methodology/'),
  howItWorks: () => href('how-it-works/'),
  addAModel: () => href('add-a-model/'),
  history: () => href('history/'),
  historyForQuestion: (questionId: string) => href(`history/${questionId}/`),
  runs: () => href('runs/'),
  report: (questionId: string) => href(`reports/${questionId}/`),
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

/** The GitHub repository this site is built from. */
export const REPO_URL = 'https://github.com/endash/hotdogbenchmark'

/** Deep link to a source file, so the site can point at the code it describes. */
export function sourceUrl(path: string, ref = 'main'): string {
  return `${REPO_URL}/blob/${ref}/${path}`
}
