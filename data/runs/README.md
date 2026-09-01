# `data/runs` — one JSON file per weekly edition

Filenames are ISO weeks in UTC: `2026-W36.json`. Re-running the benchmark in the same week
overwrites that week's file, so a re-run corrects an edition rather than duplicating it.

Every file validates against `src/schema/run.ts`. `npm run data:validate` checks all of them;
`npm run data:index` regenerates the `data/index.json` manifest that the site reads.

These files are committed. They are the benchmark's actual output and the reason the site can
be entirely static.
