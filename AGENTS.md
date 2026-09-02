# Working on hotdogbenchmark

Guidance for any coding assistant working in this repository. `CLAUDE.md` adds the Claude
Code specifics; everything here applies to all of them.

## What this is

Every Monday a GitHub Action asks eleven AI models from seven vendors "Is a hot dog a sandwich?
One word answer.", plus two more questions like it, three times each, under three framings:
asked plainly, told the answer is yes, told the answer is no. The runner records every verbatim
answer, its verdict, latency, tokens and estimated cost, writes one JSON edition per ISO week to
`data/runs/`, and the Astro site publishes it at <https://hotdogbenchmark.lol> as an analyst
report, with an answer-board replay, a framing explorer, a PDF per report, and week-by-week
history. It is a teaching project: the unglamorous parts of a real cross-provider benchmark,
solved in the smallest honest way and documented.

## Layout

| Path               | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `questions.json`   | Questions, framings' claims and denials, and the copy the site derives from them |
| `models.json`      | Models with provider, id, pricing, docs reference, and an `enabled` switch       |
| `src/providers/`   | One adapter per vendor; `fetch` and credentials injected; no Node imports        |
| `src/runner/`      | Runs the matrix with bounded concurrency; classifies answers; aggregates         |
| `src/schema/`      | Zod schemas: the versioned data contract                                         |
| `src/data/`        | Loads, migrates and indexes editions                                             |
| `src/cli/`         | The `bench` command                                                              |
| `src/site/`        | Astro pages, components, styles, and `lib/` (prose, seo, scores, sensitivity)    |
| `scripts/`         | OG cards, PDFs, screenshots, and the axe, responsive and keyboard audits         |
| `tests/`           | Vitest; `tests/site/` builds the site and drives it with Playwright              |
| `docs/`            | Tutorial, providers, self-hosting, DNS and hosting, data schema, accessibility   |
| `proxy/`           | Cloudflare Worker for the deferred "run your own" page (off by default)          |
| `.rex/`, `.hench/` | Product requirements and work records kept by n-dx; optional for contributors    |

## Commands

```sh
nvm use && npm install
npm run bench -- run --mock --out tmp/mock-run.json   # the pipeline, offline, no keys
npm run dev                                            # the site at http://localhost:4321
npm run build                                          # dist/ with OG cards and PDFs
npm run validate                                       # format, lint, typecheck, tests (tests build the site)
npm run test:a11y && npm run test:responsive && npm run test:audit   # the gates, against dist/
npm run bench:smoke -- --all                           # one live call per configured provider
```

## Rules that are enforced by tests

- Adapters and the runner import no Node builtins and read no `process.env`.
- No committed fixture or data file contains a key-shaped string.
- Every color pair in `src/site/styles/tokens.css` meets its WCAG ratio.
- Client JavaScript stays under 30 KB gzipped; the analytics tag and JSON-LD do not count.
- Every built page appears in `sitemap.xml` exactly once; every page has a unique title and
  description, an OG image that exists, and only the claimed JSON-LD types.
- The front page and every report carry the model names and their answers as HTML text.
- Inline markup is never glued to the words around it.
- The pull-request workflow references no secrets.

## Rules that are not enforced by tests

- The site never calls a provider. Recorded data only.
- Copy comes from `questions.json`; a fork with a different question needs no code change.
- American spelling. Chill, plain voice; the deadpan is in the report structure, not in the
  prose.
- Progressive enhancement: everything works with scripts off; the replay and explorer are
  extras.
- Keep the print stylesheet honest: the PDFs are rendered from it.
- Fonts are self-hosted; do not reintroduce a third-party stylesheet or a `size-adjust` face.
- Provider keys live only in the untracked `.env` locally and in Actions secrets on GitHub. The
  GA4 measurement ID is the `PUBLIC_GA_MEASUREMENT_ID` repository variable.

## Data

`data/runs/<iso-week>.json` is an edition. Re-running a week supersedes the file, and the old
one moves to `data/runs/superseded/`. `data/index.json` is generated; `npm run data:index`
must produce no diff. The schema version is in `src/schema/run.ts`; a breaking change bumps it
and adds a migration in `src/data/migrate.ts`.

## Accounts and cost

A full edition is about 300 calls and costs about a quarter. `docs/providers.md` has per-vendor
setup and prices. Models whose accounts are unfunded or unkeyed are disabled in `models.json`
with a note, not deleted.
