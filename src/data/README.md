# `src/data` — reading and writing the `data/` directory

The Node-only half of persistence, kept separate from `src/runner` so the runner core stays
runtime-agnostic.

| File            | Role                                                                              |
| --------------- | --------------------------------------------------------------------------------- |
| `paths.ts`      | ISO-week filename derivation and the canonical `data/runs/<isoWeek>.json` layout. |
| `index.ts`      | Validates every run file and regenerates `data/index.json`.                       |
| `migrate.ts`    | Migrates older run files to the current schema on read. Pure; never writes.       |
| `registries.ts` | Reads `questions.json`, `models.json` and `conditions.json` off disk.             |
