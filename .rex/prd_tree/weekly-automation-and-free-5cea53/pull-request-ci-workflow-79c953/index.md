---
id: "79c953ce-f54d-4b9e-bb75-7142e98db679"
level: "feature"
title: "Pull request CI workflow"
status: "completed"
priority: "high"
tags:
  - "ci"
blockedBy:
  - "7b491be0-3e4c-4d74-a6e4-8ee87a7811f7"
source: "ndx-capture"
startedAt: "2026-09-01T22:21:26.853Z"
completedAt: "2026-09-01T22:21:26.853Z"
endedAt: "2026-09-01T22:21:26.853Z"
acceptanceCriteria:
  - "ci.yml runs on pull_request and push to main with jobs for lint, typecheck, test, data validation, site build, and a11y"
  - "Workflow declares permissions: contents: read only and references no secrets"
  - "A PR that breaks the data schema or introduces an axe violation fails CI with a readable error"
description: "A GitHub Actions workflow on pull_request and push that runs lint, typecheck, unit tests, data schema validation, the site build, and axe accessibility checks over the built site. Uses no provider secrets so fork PRs are safe. Starts minimal (lint/typecheck/test) as soon as the scaffold exists and grows as the schema, site, and a11y tooling land."
lastModified: "2026-09-01T22:21:26.862Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Create ci.yml with lint, typecheck, and unit test jobs](./create-ci-yml-with-lint-373822.md) | completed |
| [Extend ci.yml with data schema validation and site build jobs](./extend-ci-yml-with-data-schema-b17721.md) | completed |
