---
id: "373822e3-55d6-4282-ae9a-ba56ea9db457"
level: "task"
title: "Create ci.yml with lint, typecheck, and unit test jobs"
status: "in_progress"
priority: "high"
tags:
  - "ci"
blockedBy:
  - "18b13b3b-d67b-479b-8104-0fdd85df7b3e"
source: "ndx-capture"
startedAt: "2026-09-01T21:58:30.002Z"
acceptanceCriteria:
  - "ci.yml runs on pull_request and push to main and passes on the scaffold"
  - "Workflow uses the Node version from .nvmrc and caches npm"
  - "Workflow declares permissions contents: read and a cancel-in-progress concurrency group"
description: "Add .github/workflows/ci.yml triggered on pull_request and push to main. Use actions/setup-node with the pinned version and npm cache, run npm ci, lint, typecheck, and test. Declare permissions contents: read. Add a concurrency group per ref that cancels superseded runs. Keep it secret-free so fork PRs run."
lastModified: "2026-09-01T21:58:30.014Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
