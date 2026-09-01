---
id: "c64abe7c-a006-47dd-924e-99b56bf59a64"
level: "task"
title: "Add failure policy: exit-code handling, consecutive-failure detection, and GitHub issue automation"
status: "pending"
priority: "medium"
tags:
  - "ci"
  - "automation"
blockedBy:
  - "276e25f4-d1dd-4115-b85e-bb0e2723445c"
source: "ndx-capture"
acceptanceCriteria:
  - "health.ts returns providers that errored in the last three runs and is unit tested with fixture run files including fewer than three runs"
  - "When bench run exits 1 the job fails and an issue labeled benchmark-failure is opened or updated with the summary"
  - "When a provider errors three consecutive weeks an issue labeled provider-degraded is opened or updated and no duplicate issues are created"
  - "A partially successful run still commits data and the job succeeds"
description: "Extend benchmark.yml so a bench run exit code 1 (all models failed) fails the job and a step using github-script opens an issue labeled benchmark-failure (or comments on the open one) with the step summary. Add a small script src/runner/health.ts that reads the last three run files and lists providers with status error in all three; the workflow runs it after a successful run and opens or updates an issue labeled provider-degraded naming those providers. Add permissions issues: write. Make sure a run with partial success still commits and succeeds."
lastModified: "2026-09-01T18:47:46.256Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
