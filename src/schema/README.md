# `src/schema` — the contract between the runner and the site

Zod schemas plus the TypeScript types inferred from them. The runner writes data that matches
these shapes; the site build refuses to start if any committed data file does not.

| File           | Role                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `run.ts`       | `BenchmarkRun` and everything inside it: questions, per-model results, samples, usage, timing. |
| `questions.ts` | The `questions.json` registry — which questions get asked.                                     |
| `models.ts`    | The `models.json` registry — which models get asked, and what they cost.                       |

`schemaVersion` is part of a run file from day one, so the site can still render a run written
before the schema changed. Field-by-field documentation lives in `docs/data-schema.md`.
