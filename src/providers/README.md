# `src/providers` — one file per AI vendor

Each file here implements the same tiny `ProviderAdapter` interface: given a model ID and a
prompt, return the text the model produced, how many tokens it used, and how long it took.

**These files must run unchanged in a browser.** They never import `node:` builtins and never
read `process.env` — credentials and `fetch` arrive through an injected `AdapterContext`. That
constraint is enforced by ESLint, not by discipline, because it is what later allows the same
adapters to power a browser-side "run your own benchmark" feature.

| File          | Role                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| `types.ts`    | The `ProviderAdapter` interface and its supporting shapes. The primary teaching surface. |
| `registry.ts` | Provider id → adapter lookup, plus the id → env-var map the CLI uses.                    |
| `http.ts`     | Shared fetch wrapper: timeout, retry with backoff, error normalization.                  |
| `timing.ts`   | Wall-clock and time-to-first-token measurement.                                          |
| `<vendor>.ts` | One adapter per vendor. Start by reading `anthropic.ts`; it is the reference.            |

Adding a provider is a one-file change plus a `models.json` entry. See `docs/tutorial/`.
