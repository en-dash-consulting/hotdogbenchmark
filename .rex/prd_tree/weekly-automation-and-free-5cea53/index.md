---
id: "5cea53e4-814c-44d2-ab1c-fc982b19aa3a"
level: "epic"
title: "Weekly automation and free hosting on GitHub"
status: "completed"
priority: "high"
tags:
  - "ci"
  - "hosting"
  - "automation"
blockedBy:
  - "423c74c8-12a3-4d6b-ab38-d452a92681e1"
source: "ndx-capture"
startedAt: "2026-09-01T22:21:26.900Z"
completedAt: "2026-09-01T22:21:26.900Z"
endedAt: "2026-09-01T22:21:26.900Z"
acceptanceCriteria:
  - "A cron-scheduled workflow runs weekly, commits data/runs changes with a bot identity, and can also be triggered manually via workflow_dispatch"
  - "The site is served from GitHub Pages and redeploys automatically after every data commit and every push to main"
  - "PR workflow runs lint, typecheck, tests, data schema validation, site build, and axe a11y checks without access to provider secrets"
  - "docs/self-hosting.md lets a forker enable Pages, add secrets, and change the schedule without reading source"
description: "Run the benchmark automatically once a week and publish the site for free using only GitHub features: a scheduled GitHub Actions workflow runs the benchmark with provider keys from repository secrets, commits the new data file back to main, then builds and deploys the static site to GitHub Pages. Also covers the PR quality workflow (lint, typecheck, tests, schema validation, site build, a11y smoke test) that never exposes secrets to fork PRs, a failure policy that files or updates a GitHub issue when a run or provider fails repeatedly, and a fork-and-self-host guide so learners can stand up their own copy in minutes."
lastModified: "2026-09-01T22:21:26.910Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [GitHub Pages deployment and self-hosting guide](./github-pages-deployment-and-6e12c8/index.md) | completed |
| [Pull request CI workflow](./pull-request-ci-workflow-79c953/index.md) | completed |
| [Weekly benchmark workflow: scheduled run, data commit, and failure policy](./weekly-benchmark-workflow-f73135/index.md) | completed |
