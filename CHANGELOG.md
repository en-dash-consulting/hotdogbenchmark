# Changelog

Notable changes to this project. The weekly data itself is not changelogged —
every edition is in [`data/runs/`](data/runs/) and on the
[history page](https://endash.github.io/hotdogbenchmark/history/).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html)
where the public surface is the **data schema**, not the TypeScript API.

## [Unreleased]

### Pending before 1.0.0

- Six of the seven provider adapters have not been exercised against a live
  API; only xAI has. Their fixtures are authored to each vendor's documented
  wire format rather than captured. See the open task in the PRD.
- The first real weekly run has not been collected. The site currently renders
  a run marked `isMock: true`, which it labels as sample data.
- No screen-reader pass has been done. See
  [`docs/a11y-checklist.md`](docs/a11y-checklist.md).
- The proxy has never run against a real En Dash identity provider.

## [0.1.0] — 2026-09-01

The whole pipeline, end to end, with sample data.

### Added

**Benchmark runner**

- Seven provider adapters — Anthropic, OpenAI, Google Gemini, xAI, Mistral,
  DeepSeek, and Meta Llama via Together AI — behind a one-method
  `ProviderAdapter` interface. Adapters receive credentials and `fetch` by
  injection and are forbidden by lint from importing Node builtins.
- Shared HTTP layer with per-request timeouts, jittered exponential backoff,
  `Retry-After` handling, and a six-category error taxonomy.
- Bounded-concurrency runner that never has more than one in-flight call per
  provider, tolerates any provider being down, and skips models with no
  configured key rather than recording them as failures.
- Answer classification, median aggregation, and cost estimation from a dated
  pricing table.
- `--mock` mode replaying recorded fixtures, so the entire pipeline runs with
  no API keys and no network.

**Data**

- Versioned zod schema for a benchmark run, with `schemaVersion` carried from
  the first commit.
- One JSON file per ISO week; re-running a week corrects that edition rather
  than creating a second one.
- Generated, deterministic `data/index.json` manifest.

**Site**

- Astro static site, zero client JavaScript by default (918 bytes gzipped
  site-wide, all of it the theme toggle).
- Per-question report pages with masthead, executive summary generated from the
  data, KPI tiles, quadrant chart, leaderboard, vendor scorecards, profiles, and
  a semantic table with progressive-enhancement sorting.
- Archive pages per edition and a history view with verdict-share and per-model
  trend charts, all build-time SVG with data-table alternatives.
- Learn pages: how it works with code excerpts read from source, methodology
  rendering the live classification rules, and add-a-model.
- Print stylesheet and a tagged PDF edition per report.
- Generated OpenGraph cards, sitemap, robots.txt, JSON Feed and RSS.

**Automation**

- Weekly GitHub Actions benchmark that commits data and triggers a redeploy.
- GitHub Pages deployment.
- Pull-request CI referencing no secrets: format, lint, typecheck, tests, a
  keyless benchmark run, data validation, site build, axe accessibility checks,
  Lighthouse budgets, and a browser-bundle test.
- Failure policy opening labelled issues for a failed run or a provider that
  has failed three consecutive editions.

**Deferred feature, behind a flag**

- Browser-ready runner core, proven by a CI test that bundles it with no Node
  polyfills and runs a benchmark in headless Chromium.
- Cloudflare Workers proxy with En Dash OIDC sign-in, an exact-hostname
  allowlist, streaming relay, rate limits, and logging that cannot record a key.
- Bring-your-own-keys runner UI on `/run/`, off by default.

**Documentation**

- Eight-page tutorial mapping each concept to the file that implements it.
- Self-hosting guide, provider cost guide, data schema reference, usage
  normalization reference, proxy threat model, accessibility checklist.

### Measured

- Lighthouse 100 / 100 / 96 / 100 with CLS 0 on the audited pages.
- Zero axe violations across every page in both themes.
- 835 tests.

[Unreleased]: https://github.com/endash/hotdogbenchmark/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/endash/hotdogbenchmark/releases/tag/v0.1.0
