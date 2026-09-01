---
id: "276e25f4-d1dd-4115-b85e-bb0e2723445c"
level: "task"
title: "Create benchmark.yml scheduled workflow that runs the benchmark and commits data"
status: "pending"
priority: "high"
tags:
  - "ci"
  - "automation"
blockedBy:
  - "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "A manual workflow_dispatch run completes and pushes a new data/runs file and updated index with the bot identity"
  - "A second run in the same week with identical results makes no commit"
  - "Workflow has permissions contents: write only at this stage, a concurrency group, and timeout-minutes set"
  - "Step summary shows the tally and per-model status table"
description: "Add .github/workflows/benchmark.yml with on: schedule (cron '0 12 * * 1') and workflow_dispatch (inputs: samples, models). Steps: checkout with a token that can push, setup-node from .nvmrc, npm ci, npm run bench -- run with every provider key passed from secrets as env, npm run data:validate, npm run data:index, then commit and push data/ with a bot identity (github-actions[bot]) only if git status shows changes. Set permissions contents: write, concurrency group benchmark with cancel-in-progress false, timeout-minutes 30. Write the yes/no/other tally and per-model status into GITHUB_STEP_SUMMARY."
lastModified: "2026-09-01T18:46:13.891Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
