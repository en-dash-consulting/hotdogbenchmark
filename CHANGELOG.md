# Changelog

Notable changes to this project. The weekly data itself is not changelogged —
every edition is in [`data/runs/`](data/runs/) and on the
[history page](https://endash.github.io/hotdogbenchmark/history/).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html)
where the public surface is the **data schema**, not the TypeScript API.

## [Unreleased]

### Added

- **Experimental conditions.** Every question is now asked under every enabled
  entry in a third registry, `conditions.json`: the `control` (no system
  prompt), `asserted` (a system prompt stating "A hot dog is a sandwich.") and
  `denied` (its negation). Templates take `{subject}`, so the taco question is
  told about tacos. The run matrix is condition × question × model × samples;
  the weekly cost triples to roughly $0.12, and a fork can pass
  `--conditions control` or disable the arms to keep the old 63-call run.
- **Schema version 2.** Each result cell carries `conditionId` and the exact
  `prompt` and `systemPrompt` sent; a run records its `conditions`. Version-1
  files are validated against the version-1 rules and migrated in memory on
  read (`src/data/migrate.ts`), so the committed archive is never rewritten. A
  frozen version-1 fixture proves it.
- **System prompts through every vendor's own mechanism** — Anthropic's
  top-level `system`, OpenAI's Responses `instructions`, Gemini's
  `systemInstruction`, and a leading `role: "system"` message for the four
  OpenAI-compatible adapters. Each adapter has a test asserting the body is
  byte-identical when no system prompt is set, so the control arm is provably
  the measurement earlier editions took.
- **Framing sensitivity in the report.** Each report gains a position-by-framing
  matrix marking the models that moved, the verbatim answer every model gave
  under every framing behind a `<details>`, the arms as actually sent, and an
  edition-wide sensitivity chart with a data-table alternative — all build-time
  HTML and SVG, no client JavaScript. Each non-control arm also has a full
  report page of its own. The measure is defined once in
  `src/site/lib/sensitivity.ts` and rendered on the methodology page from that
  constant, which states that neither robustness nor compliance is treated as
  better.
- **A front page that says something.** The home page now shows each
  question's consensus, tally and latency, and the edition's framing-sensitivity
  headline with a per-vendor table.
- `bench run --conditions <ids>`, a `conditions` input on the weekly workflow,
  `--dry-run` printing the full matrix and call count, and `bench:record`
  capturing every condition so mock mode replays real recorded sensitivity.

- **Several models per provider.** `models.json` now lists Claude Opus 5,
  Sonnet 5 and Haiku 4.5; GPT-5.6 Sol, GPT-5.5 and GPT-5.4 mini; Grok 4.6,
  Grok 4.3 and Grok 4.20 with reasoning off; Mistral Medium 3.5 and Small 4.
  Ids and prices were read from each vendor's live model listing or pricing
  page on 2026-09-01. Mock fixtures are per model
  (`<provider>--<model-slug>.json`), and `bench:smoke` and `bench:record` take
  `--model`; `bench:smoke -- --all` pings every enabled model.
- **A redesigned site on the En Dash brand.** Navy, teal and purple;
  Montserrat and Merriweather; the square En Dash mark. The front page replays
  each model's answer at its recorded latency, lets a reader tell the models
  the answer and watch who flips, and shows an alignment grid and a sway
  chart. Nothing on the site calls a provider.

### Changed

- Gemini, DeepSeek and Llama via Together are **disabled in `models.json`**
  until their accounts are sorted: exhausted free-tier quota, no credit, and
  no key respectively. Each entry says so and how to re-enable it.
- Mock fixtures for Anthropic, OpenAI, xAI and Mistral are now live captures
  under all three conditions. Gemini's stayed authored: its free-tier quota was
  exhausted during recording. DeepSeek and Together remain authored, blocked on
  account state.
- `bench:record` uses the runner's 1024-token output cap rather than 64, the
  same bug the runner had; a reasoning model given too little room records an
  empty answer.

### Done since 0.1.0

- **The first real benchmark run is committed.** `data/runs/2026-W36.json` is
  real data from five providers: 43 samples, $0.037, `isMock: false`. The site
  no longer shows the sample-data notice.
- **Five of seven adapters verified against live APIs** — anthropic, openai,
  gemini, xai, mistral. Each Verified row in
  [`docs/usage-normalization.md`](docs/usage-normalization.md) carries the
  measurement that established it.
- **Four bugs found by that verification**, none of which a fixture test could
  have caught. See the commit "First real benchmark run, and the four bugs live
  verification found":
  - `DEFAULT_MAX_OUTPUT_TOKENS` was 64, which made reasoning models return
    empty answers. Now 1024.
  - The Anthropic adapter hardcoded `reasoningTokens: null` with a comment
    asserting the field does not exist. It does.
  - `mistral-large-3-25-12` is a documentation slug the API rejects; the
    registry now uses `mistral-medium-2604`.
  - Gemini counts thoughts outside `candidatesTokenCount`, confirmed
    arithmetically.
- **`bench:smoke --all`** pings every configured provider in one command.
- **Cost figures in `docs/providers.md` are now measured** rather than
  estimated: ~$0.04/week, ~$0.18/month for all seven.

### Pending before 1.0.0

- **Two adapters still unverified**, both blocked on account state rather than
  code: DeepSeek's key authenticates but the account has no credit (402
  Insufficient Balance), and no `TOGETHER_API_KEY` is set. DeepSeek's
  `prompt_cache_hit_tokens` mapping is the only vendor-specific override in the
  shared helper and has never run against a real response — treat it as suspect.
- **The repository has no git remote.** Nothing is pushed. Pages is not enabled,
  the description/topics/social preview are unset, and the README badges and
  live link therefore do not resolve. See
  [`docs/launch-checklist.md`](docs/launch-checklist.md).
- **The real run was produced locally, not by `benchmark.yml`.** The scheduled
  workflow has never executed. Running it once via `workflow_dispatch` is what
  actually proves the automation.
- **No screen-reader pass.** See
  [`docs/a11y-checklist.md`](docs/a11y-checklist.md) for the seven specific
  questions a person needs to answer.
- **The proxy has never run against a real En Dash identity provider.** All 45
  of its tests use a mocked IdP.
- **Do not tag v1.0.0** until the above is resolved — specifically until a
  workflow-produced run is published on a live site.

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
- Failure policy opening labeled issues for a failed run or a provider that
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
