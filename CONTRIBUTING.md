# Contributing

This repository is a teaching artifact as much as it is a benchmark. Changes that make the
pipeline easier to understand are as welcome as changes that make it more accurate.

You do **not** need an API key to contribute. Mock mode runs the entire pipeline from recorded
fixtures.

## New here?

Read [`docs/tutorial/`](docs/tutorial/) first — eight pages walking the pipeline in the order you
would build it, each mapping a concept to the file that implements it. It is the fastest way to
understand why the code is shaped the way it is.

## Setup

```sh
git clone https://github.com/endash/hotdogbenchmark.git
cd hotdogbenchmark
nvm use            # Node version is pinned in .nvmrc
npm install
```

## Mock mode

The first command to run, and the one CI runs on every pull request:

```sh
npm run bench -- run --mock
```

This replays recorded provider responses from `tests/fixtures/responses/`, writes a schema-valid
run file marked `isMock: true`, and never touches the network. Set `BENCH_SEED` to make the
simulated timings deterministic:

```sh
BENCH_SEED=1 npm run bench -- run --mock
```

Then build the site over that data:

```sh
npm run dev
```

## Tests

```sh
npm test           # Vitest unit suite
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run data:validate   # every file under data/ against the schema
```

All four run in CI on every pull request. There is no separate formatting step to remember —
`npm run format` rewrites, `npm run format:check` verifies.

## Adding a question

Questions live in `questions.json` at the repository root. Add an entry:

```json
{
  "id": "grilled-cheese",
  "subject": "a grilled cheese",
  "text": "Is a grilled cheese a sandwich? One word answer.",
  "reportTitle": "Sandwich Classification Benchmark: Grilled Cheese Edition",
  "enabled": true
}
```

Two rules the schema enforces: ids are unique, and every `text` ends with `One word answer.`
so the methodology page can state the prompt template once and have it be true.

Adding a question increases the weekly cost **linearly** — every enabled model answers every
enabled question, three times. With seven models at three samples, one more question is 21 more
API calls per week. The prompts are tiny, so this is cents, but it is not free.

## Adding a model

Edit `models.json`. Verify the model ID against the provider's current documentation — do not
guess it, and record the `docsUrl` you verified it against. Fill in `pricing` with an `asOf`
date, then:

```sh
npm run bench:smoke -- --provider <id>   # one live call, prints text, usage, timing
```

## Adding a provider

Adapters are one file each and deliberately small. The Anthropic adapter is the reference
implementation; start by reading it.

1. Copy `src/providers/anthropic.ts` to `src/providers/<vendor>.ts`.
2. Implement `complete()` against the vendor's HTTP API. Use `fetchWithPolicy` from
   `src/providers/http.ts` for timeout and retry behavior rather than calling `fetch` directly.
3. Map the vendor's usage payload onto the shared `Usage` shape and add your row to
   `docs/usage-normalization.md`, including whether reasoning tokens are counted inside output
   tokens for that vendor.
4. Record fixtures for success, a 429, and a malformed body:
   `npm run bench:record -- --provider <id>`. Keys are redacted on capture; a test scans
   fixtures for key-shaped strings.
5. Register the adapter in `src/providers/registry.ts` and add its key variable to
   `src/env.ts` and `.env.example`.
6. Add the model to `models.json`.

**Two constraints the linter enforces**, because they are what let the same adapters run in a
browser later: no `node:` imports and no `process.env` anywhere under `src/providers` or
`src/runner`. Credentials and `fetch` arrive through `AdapterContext`.

Keep the adapter under about 150 lines. It is a tutorial example before it is infrastructure.

## Pull requests

- One logical change per pull request.
- Tests for anything with a branch in it. Fixtures for anything that talks to a network.
- Update the docs that describe what you changed — `docs/usage-normalization.md` and
  `docs/data-schema.md` in particular go stale fast.
- **No secrets.** Not in code, not in fixtures, not in test data. The PR template asks you to
  confirm this; please actually check.
- CI must be green. If a lint rule is in your way, fix the code rather than suppressing the
  rule — suppression comments are rejected in review.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
