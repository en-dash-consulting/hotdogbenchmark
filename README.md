# hotdogbenchmark

A weekly cross-provider LLM benchmark that asks every major model the same question and
publishes the answers as a straight-faced industry analyst report.

> **Research question:** _Is a hot dog a sandwich? One word answer._

This project exists to teach benchmarking. The question is silly on purpose; everything
around it — provider adapters, usage normalization, latency measurement, sampling,
versioned data, scheduled runs, honest presentation — is exactly how you would build a
serious benchmark.

## Development

```sh
nvm use          # Node version is pinned in .nvmrc
npm install
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Serve the Astro site locally with live reload |
| `npm run build`     | Build the static site into `dist/`            |
| `npm run bench`     | Run the benchmark (see the runner epic)       |
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
- **@types/node** — types for the Node APIs used in the CLI and build scripts.

## License

MIT. See [LICENSE](LICENSE).
