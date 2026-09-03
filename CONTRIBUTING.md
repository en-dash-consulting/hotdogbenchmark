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
git clone https://github.com/en-dash-consulting/hotdogbenchmark.git
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

The site has its own gates, run against a built `dist/`:

```sh
npm run build              # build the site first
npm run test:a11y          # axe on every page: light, dark, forced colors, reduced motion
npm run test:responsive    # reflow, pointer targets, focus visibility, text spacing, at seven widths
npm run test:budget        # client JavaScript under 30 KB gzipped
```

All of these run in CI on every pull request. There is no separate formatting step to remember —
`npm run format` rewrites, `npm run format:check` verifies.

## Adding a question

**File:** `questions.json`. **Verify:** `npm run bench -- run --dry-run`.

The question does not have to be about sandwiches. The shipped framings in `conditions.json`
are, so a question of a different shape means rewriting those templates too (see
[`docs/fork-this.md`](docs/fork-this.md), step 4). Add an entry:

```json
{
  "id": "burrito",
  "subject": "a burrito",
  "text": "Is a burrito a sandwich? One word answer.",
  "reportTitle": "The Burrito Question",
  "tagline": "Bread on all sides. Massachusetts said no in 2006.",
  "enabled": true
}
```

Three rules. The schema enforces two: ids are unique, and every `text` ends with
`One word answer.` so the methodology page can state the prompt template once and have it be
true. Mock mode enforces the third: the `id`, with dashes read as spaces, must appear in `text`,
because that is how the replayer matches a prompt to a recorded answer.

Recorded fixtures do not know about a new question. Record it per provider and model with
`npm run bench:record -- --provider <id> [--model <modelId>]` so `--mock` can show it. The dry
run prints the plan, the rendered framings and the total call count without calling anything.

A question has a `status`: `proposed` (accepted, shown on the site under "Up next", not yet
asked), `live` (asked in every edition) or `retired` (kept for the archive, asked no more). A
new question lands as `proposed`; a maintainer switches it live. `contributor` records who sent
it in and whether they want the credit; without it the question is uncredited, and with
`"credit": false` it stays that way. `cadence` is `every` unless the bill says otherwise.

Adding a question increases the weekly cost **linearly**: every enabled model answers every
enabled question under every enabled framing, three times. With eleven models, three framings
and three samples, one more question is 99 more API calls a week. The prompts are tiny, so this
is cents, but it is not free.

## Adding a model

**File:** `models.json`. **Verify:** `npm run bench:smoke -- --provider <id> --model <modelId>`.

Copy a sibling entry for the same provider. Read the model id from the provider's live
model-listing endpoint where one exists rather than from prose docs, and record the page you
verified it against in `docsUrl`. Fill in `pricing` with an `asOf` date. Then run the smoke
command above: one live call that prints text, usage and timing, and tells you immediately
whether the id, the key and the adapter all work.

Then record its fixture so mock mode can replay it:
`npm run bench:record -- --provider <id> --model <modelId>`. A provider's first model keeps the
plain `tests/fixtures/responses/<provider>.json`; further models get
`<provider>--<model-slug>.json`.

## Adding a provider

**File:** `src/providers/<provider>.ts`. **Verify:** `npm run bench:smoke -- --provider <provider>`.

Adapters are one file each and deliberately small. The Anthropic adapter is the reference
implementation; start by reading it.

1. Copy `src/providers/anthropic.ts` to `src/providers/<provider>.ts`.
2. Implement `complete()` against the vendor's HTTP API. Use `fetchWithPolicy` from
   `src/providers/http.ts` for timeout and retry behavior rather than calling `fetch` directly.
3. Map the vendor's usage payload onto the shared `Usage` shape and add your row to
   `docs/usage-normalization.md`, including whether reasoning tokens are counted inside output
   tokens for that vendor.
4. Register the adapter with one `registerAdapter(...)` line in `src/providers/all.ts`, and add
   its key variable to `CREDENTIAL_ENV_VARS` in `src/providers/registry.ts`. Mirror the variable
   in `.env.example` and in the `env` block of `.github/workflows/benchmark.yml`, which lists
   every secret explicitly.
5. Add the model to `models.json` with `"provider": "<provider>"`.
6. Record fixtures for success, a 429, and a malformed body:
   `npm run bench:record -- --provider <provider>`. Keys are redacted on capture; a test scans
   fixtures for key-shaped strings.

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

Be decent to each other; disagreements about classification rules are welcome, disagreements about people are not.
