// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

/**
 * Static output, no UI framework integration, no client JavaScript by default.
 *
 * ## Base path
 *
 * GitHub Pages serves a project site under `/<repo>/`, so every internal link
 * has to carry that prefix or the deployed site 404s while the local one works
 * — which is exactly the kind of bug that only shows up after deploying.
 *
 * `SITE_URL` overrides both when serving from a custom domain (where the base
 * is `/`), and `GITHUB_REPOSITORY` supplies the repo name in Actions. Locally,
 * with neither set, the base is `/` and `npm run dev` behaves like a root site.
 *
 * Always use Astro's `import.meta.env.BASE_URL` (or the `href()` helper in
 * src/site/lib/urls.ts) rather than writing absolute paths by hand.
 */
import { existsSync, readFileSync } from 'node:fs'

/**
 * A custom domain wins over everything: when public/CNAME exists, GitHub Pages
 * serves the site from that host at the root, so the canonical origin is that
 * host and the base is "/". One host only; the other redirects.
 */
const cname = existsSync('./public/CNAME') ? readFileSync('./public/CNAME', 'utf8').trim() : ''
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const siteUrl = process.env.SITE_URL || (cname ? `https://${cname}` : '')

const base = siteUrl || !repository ? '/' : `/${repository}/`
const site =
  siteUrl ||
  (repository
    ? `https://${process.env.GITHUB_REPOSITORY_OWNER ?? 'endash'}.github.io${base}`
    : 'http://localhost:4321')

export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'always',
  srcDir: './src/site',
  publicDir: './public',
  // Overridable so a test can build into its own directory rather than racing
  // another test for dist/.
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  build: {
    // One stylesheet rather than many small ones: this site's CSS is small
    // enough that per-page files would cost more in requests than they save.
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  integrations: [sitemap()],
  devToolbar: { enabled: false },
})
