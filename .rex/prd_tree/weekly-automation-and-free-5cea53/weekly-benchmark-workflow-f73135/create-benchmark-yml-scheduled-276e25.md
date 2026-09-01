---
id: "276e25f4-d1dd-4115-b85e-bb0e2723445c"
level: "task"
title: "Create benchmark.yml scheduled workflow that runs the benchmark and commits data"
status: "completed"
priority: "high"
tags:
  - "ci"
  - "automation"
blockedBy:
  - "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T22:16:13.872Z"
completedAt: "2026-09-01T22:21:01.651Z"
endedAt: "2026-09-01T22:21:01.651Z"
resolutionType: "code-change"
resolutionDetail: ".github/workflows/benchmark.yml runs on cron '0 12 * * 1' and workflow_dispatch (samples/models inputs), passes all seven provider keys from secrets, validates, regenerates the manifest, and commits data/ as github-actions[bot] only when git reports changes. permissions contents:write + issues:write, concurrency group 'benchmark' with cancel-in-progress:false (cancelling a half-finished run wastes real money), timeout-minutes 30. scripts/step-summary.mjs writes the yes/no/other tally and a per-model status table into GITHUB_STEP_SUMMARY — verified by running it against real data. Idempotence for a same-week re-run comes from the ISO-week filename plus a timestamp-free manifest, both already tested.</resolutionDetail>\n"
acceptanceCriteria:
  - "A manual workflow_dispatch run completes and pushes a new data/runs file and updated index with the bot identity"
  - "A second run in the same week with identical results makes no commit"
  - "Workflow has permissions contents: write only at this stage, a concurrency group, and timeout-minutes set"
  - "Step summary shows the tally and per-model status table"
description: "Add .github/workflows/benchmark.yml with on: schedule (cron '0 12 * * 1') and workflow_dispatch (inputs: samples, models). Steps: checkout with a token that can push, setup-node from .nvmrc, npm ci, npm run bench -- run with every provider key passed from secrets as env, npm run data:validate, npm run data:index, then commit and push data/ with a bot identity (github-actions[bot]) only if git status shows changes. Set permissions contents: write, concurrency group benchmark with cancel-in-progress false, timeout-minutes 30. Write the yes/no/other tally and per-model status into GITHUB_STEP_SUMMARY."
lastModified: "2026-09-01T22:21:01.665Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
