---
id: "605914d2-79c7-4568-a847-3ae7cc099ce2"
level: "task"
title: "Establish src and data directory layout with environment loading"
status: "completed"
priority: "high"
tags:
  - "foundation"
blockedBy:
  - "18b13b3b-d67b-479b-8104-0fdd85df7b3e"
source: "ndx-capture"
startedAt: "2026-09-01T21:10:49.459Z"
completedAt: "2026-09-01T21:12:19.346Z"
endedAt: "2026-09-01T21:12:19.346Z"
resolutionType: "code-change"
resolutionDetail: "Created src/{runner,providers,schema,data,site} and data/runs each with a README describing its responsibility; src/cli.ts prints usage via `npm run bench -- --help`; src/env.ts exposes configuredProviders()/credentialsFromEnv() with a test proving a sentinel key never appears in output.</resolutionDetail>\n</invoke>\n"
acceptanceCriteria:
  - "Each of src/runner, src/providers, src/schema, src/site, and data/runs contains a README.md describing its responsibility"
  - "npm run bench -- --help prints usage from src/cli.ts"
  - "src/env.ts exposes a configuredProviders() helper and a unit test proves key values never appear in its output or logs"
description: "Create src/runner, src/providers, src/schema, src/site (placeholder until Astro lands), src/cli.ts entry, and data/runs with a README.md in each explaining its role in the pipeline. Add a small src/env.ts that loads .env via dotenv in local runs only, reads provider keys lazily, and reports which providers are configured without ever printing key values. Wire the bench script to src/cli.ts."
lastModified: "2026-09-01T21:12:19.360Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
