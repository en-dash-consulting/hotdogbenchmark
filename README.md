# hotdogbenchmark

Every Monday at 12:00 UTC, this project asks seven of the largest AI models the same question,
records what they said and how long they took, and publishes the results as a completely
straight-faced industry analyst report.

> ## Is a hot dog a sandwich?
>
> _One word answer._

**Live report:** _(coming soon — the site deploys to GitHub Pages once the first real run lands)_

The models are also asked about a hamburger and a taco, because a benchmark with one question
is a demo and a benchmark with three is a research programme.

## This is a teaching project

The question is deliberately silly. Nothing else about it is.

Building a _real_ cross-provider LLM benchmark means solving a specific set of unglamorous
problems: seven vendors with seven different wire formats, token counts that do not mean the
same thing across providers, latency that depends on where your runner happens to be, models
that answer differently on Tuesday than they did on Monday, and one provider having an outage
in the middle of your data collection. This repository solves those problems in the smallest
honest way, and then documents how — so you can throw away the hot dog and point it at a
question you actually care about.

If you want the serious version of this: read [`docs/tutorial/`](docs/tutorial/), swap
`questions.json`, and you have a benchmark.

## Quickstart

_(Populated by the runner epic. The first command will be `npm run bench -- run --mock`, which
runs the full pipeline from recorded fixtures — no API keys, no network.)_

## How it works

_(Populated by the runner and site epics: `models.json` → provider adapters → runner →
versioned JSON in `data/runs/` → Astro build → GitHub Actions cron → Pages.)_

## Adding a provider

Adapters are one file each and stay under about 150 lines, because they are tutorial examples
before they are infrastructure. See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-provider).

## Development

```sh
nvm use          # Node version is pinned in .nvmrc
npm install
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Serve the Astro site locally with live reload |
| `npm run build`     | Build the static site into `dist/`            |
| `npm run bench`     | Run the benchmark (`-- --help` for usage)     |
| `npm test`          | Run the Vitest unit suite                     |
| `npm run lint`      | ESLint over the whole repo                    |
| `npm run format`    | Rewrite files with Prettier                   |
| `npm run typecheck` | `tsc --noEmit` against the strict config      |

### Why each dev dependency is here

- **typescript** — strict types; also the reason `tsconfig.json` sets `erasableSyntaxOnly`,
  since Node runs these `.ts` files directly by stripping types rather than compiling them.
- **eslint**, **@eslint/js**, **typescript-eslint** — lint, plus the load-bearing rule that
  keeps `src/providers` and `src/runner` free of Node builtins and `process.env` so the same
  code can later run in a browser.
- **prettier**, **prettier-plugin-astro** — one formatting answer, no debate.
- **vitest** — fast unit tests with no extra configuration.
- **yaml** — parsing GitHub issue forms and workflows in tests, so a malformed one fails
  locally instead of silently on GitHub.
- **@types/node** — types for the Node APIs used in the CLI and build scripts.

### API keys

You do not need any to contribute. When you do want to run against real providers, copy
[`.env.example`](.env.example) to `.env` and fill in whatever keys you have; missing providers
are skipped with a warning rather than failing the run. Keys never leave `.env` locally or
GitHub Actions secrets in CI — see [SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, new providers, and screenshots of models
being weird are all welcome. Participation is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE). The data under `data/` is published under the same terms; if you
cite the Sandwich Classification Benchmark in your own work, that is between you and your
conscience.
