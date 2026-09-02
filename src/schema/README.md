# `src/schema` — the contract between the runner and the site

Zod schemas plus the TypeScript types inferred from them. The runner writes data that matches
these shapes; the site build refuses to start if any committed data file does not.

| File            | Role                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `run.ts`        | `BenchmarkRun` and everything inside it: questions, per-model results, samples, usage, timing. |
| `questions.ts`  | The `questions.json` registry — which questions get asked.                                     |
| `models.ts`     | The `models.json` registry — which models get asked, and what they cost.                       |
| `conditions.ts` | The `conditions.json` registry — the framings each question is asked under, control first.     |

`schemaVersion` is part of a run file from day one, so the site can still render a run written
before the schema changed: `parseBenchmarkRun` validates a file against the rules of the version
it declares and migrates it in memory (`src/data/migrate.ts`). Field-by-field documentation lives
in `docs/data-schema.md`.
