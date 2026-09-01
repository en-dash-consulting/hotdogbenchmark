---
id: "605914d2-79c7-4568-a847-3ae7cc099ce2"
level: "task"
title: "Establish src and data directory layout with environment loading"
status: "in_progress"
priority: "high"
tags:
  - "foundation"
blockedBy:
  - "18b13b3b-d67b-479b-8104-0fdd85df7b3e"
source: "ndx-capture"
startedAt: "2026-09-01T21:10:49.459Z"
acceptanceCriteria:
  - "Each of src/runner, src/providers, src/schema, src/site, and data/runs contains a README.md describing its responsibility"
  - "npm run bench -- --help prints usage from src/cli.ts"
  - "src/env.ts exposes a configuredProviders() helper and a unit test proves key values never appear in its output or logs"
description: "Create src/runner, src/providers, src/schema, src/site (placeholder until Astro lands), src/cli.ts entry, and data/runs with a README.md in each explaining its role in the pipeline. Add a small src/env.ts that loads .env via dotenv in local runs only, reads provider keys lazily, and reports which providers are configured without ever printing key values. Wire the bench script to src/cli.ts."
lastModified: "2026-09-01T21:10:49.473Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
