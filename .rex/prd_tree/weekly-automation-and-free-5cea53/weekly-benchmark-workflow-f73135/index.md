---
id: "f731352d-6d83-410a-b824-39801e15f124"
level: "feature"
title: "Weekly benchmark workflow: scheduled run, data commit, and failure policy"
status: "completed"
priority: "high"
tags:
  - "ci"
  - "automation"
blockedBy:
  - "37f720dc-0d58-4047-91a0-fa67ea5878ed"
source: "ndx-capture"
startedAt: "2026-09-01T22:21:06.236Z"
completedAt: "2026-09-01T22:21:06.236Z"
endedAt: "2026-09-01T22:21:06.236Z"
acceptanceCriteria:
  - "benchmark.yml runs on schedule and workflow_dispatch, reads keys only from secrets, and commits data/runs and data/index.json changes with a bot identity"
  - "Workflow declares permissions contents: write and issues: write only, a concurrency group preventing overlapping runs, and a timeout-minutes limit"
  - "A run where one provider fails still commits data and succeeds; a run where every provider fails opens or updates a GitHub issue labeled benchmark-failure"
  - "The job step summary shows the yes/no/other tally and per-model status for the run"
description: "A GitHub Actions workflow on a weekly cron (Monday 12:00 UTC) and workflow_dispatch that installs deps, runs bench run with provider keys from repository secrets, validates the output, regenerates data/index.json, and commits data/ changes to main with a bot identity (skipping the commit when nothing changed). Failure policy: per-model errors are recorded in the run file and the job still succeeds if at least one model succeeded; if the whole run fails, or a provider has errored for three consecutive weeks, the workflow opens or updates a labeled GitHub issue. Least-privilege permissions, concurrency group, job timeout, and a step summary showing the tally."
lastModified: "2026-09-01T22:21:06.244Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Add failure policy: exit-code handling, consecutive-failure detection, and GitHub issue automation](./add-failure-policy-exit-code-c64abe.md) | completed |
| [Create benchmark.yml scheduled workflow that runs the benchmark and commits data](./create-benchmark-yml-scheduled-276e25.md) | completed |
