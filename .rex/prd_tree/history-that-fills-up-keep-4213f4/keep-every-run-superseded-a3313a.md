---
id: "a3313a1c-5ccc-400f-b32c-94b1c94ecf75"
level: "feature"
title: "Keep every run: superseded editions move aside instead of being deleted"
status: "completed"
priority: "high"
tags:
  - "data"
  - "history"
source: "ndx-work session 2026-09-01"
startedAt: "2026-09-02T03:50:50.964Z"
completedAt: "2026-09-02T03:50:50.964Z"
endedAt: "2026-09-02T03:50:50.964Z"
resolutionType: "code-change"
resolutionDetail: "supersede() in src/cli/run-command.ts, mock e2e test, README note; two earlier Week 36 runs recovered under data/runs/superseded/"
acceptanceCriteria:
  - "bench run moves an existing run for the same week to data/runs/superseded/ named by week and runId, and says so"
  - "The mock end-to-end test proves the previous run survives a re-run and the manifest still lists one edition"
  - "data/runs/README.md documents the folder"
description: "When a week is re-run, the previous file moves to data/runs/superseded/<isoWeek>-<runId>.json rather than being overwritten. The site reads only top-level editions; nothing has to be recovered from git. The two earlier Week 36 runs were recovered from history into that folder."
lastModified: "2026-09-02T03:50:50.974Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
