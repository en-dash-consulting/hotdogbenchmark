---
id: "ca13dcb1-ca92-4c56-8116-a2a26ab7294b"
level: "task"
title: "Implement data storage layout, index manifest generator, and data:validate script"
status: "completed"
priority: "high"
tags:
  - "data"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
startedAt: "2026-09-01T21:25:41.056Z"
completedAt: "2026-09-01T21:28:49.802Z"
endedAt: "2026-09-01T21:28:49.802Z"
resolutionType: "code-change"
resolutionDetail: "src/data/paths.ts (isoWeekFor in UTC, tested across 9 year-boundary cases), src/data/index.ts (loadAllRuns, validateAllRuns, buildManifest, writeManifest), src/schema/manifest.ts. npm run data:index regenerates data/index.json deterministically (no embedded timestamp; a test asserts byte-identical regeneration and that the committed manifest matches a fresh build). npm run data:validate exits non-zero listing every bad file with path + JSON pointer. Sample run data/runs/2026-W36.json marked isMock:true covers all three questions.</resolutionDetail>\n"
acceptanceCriteria:
  - "isoWeekFor(date) returns e.g. 2026-W36 in UTC and is covered by tests including year-boundary weeks"
  - "npm run data:index regenerates data/index.json deterministically with per-question tallies and the file is committed"
  - "npm run data:validate fails with a readable file path and JSON pointer when a run file is invalid"
  - "A mock run file marked isMock: true covering hot-dog, hamburger, and taco exists so the site builds before real data is collected"
description: "Define data/runs/<isoWeek>.json as the canonical run location with a helper that derives the ISO week filename from a timestamp (UTC). Write src/data/index.ts that scans data/runs, validates each file, and emits data/index.json listing runs newest first with isoWeek, path, questionIds, modelCount, and per-question okCount, errorCount, and yes/no/other tallies. Add npm scripts data:index and data:validate; data:validate exits non-zero with file and path of the first schema violation. Include a sample run in data/runs generated from fixtures covering all three questions so the site has something to render before the first real run (clearly marked isMock: true in metadata)."
lastModified: "2026-09-01T21:28:49.820Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
