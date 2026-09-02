# `data/runs` — one JSON file per edition

Filenames are edition keys in UTC. At the default weekly cadence that is an ISO week,
`2026-W36.json`; a fork running `bench run --cadence day` writes one file per UTC date instead,
`2026-09-02.json`. Both kinds can sit in this directory together and the site orders them on one
timeline. Re-running the benchmark in the same edition replaces that edition's file, so a re-run
corrects an edition rather than duplicating it. The replaced run is not thrown away: it moves to
`superseded/<editionKey>-<runId>.json`, which the site does not read but which keeps every run
anyone paid for.

Every file validates against `src/schema/run.ts`. `npm run data:validate` checks all of them;
`npm run data:index` regenerates the `data/index.json` manifest that the site reads.

These files are committed. They are the benchmark's actual output and the reason the site can
be entirely static.
