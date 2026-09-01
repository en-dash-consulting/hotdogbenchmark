---
id: "fc7369f4-a33d-47f4-a561-138b2d954d90"
level: "task"
title: "Add axe-core accessibility checks over every built page in CI"
status: "in_progress"
priority: "high"
tags:
  - "a11y"
  - "ci"
blockedBy:
  - "b17721fe-2713-447d-b7c6-3af7be8e481a"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "a5315449-f666-4e50-82b3-481a997fd268"
  - "d47391a0-d076-4fe1-8374-6a1f4b5f3639"
source: "ndx-capture"
startedAt: "2026-09-01T22:18:19.902Z"
acceptanceCriteria:
  - "npm run test:a11y discovers every HTML file in dist/ and runs axe with wcag2a, wcag2aa, wcag21aa, and wcag22aa tags in both themes"
  - "An intentionally introduced violation fails CI with page, rule id, and selector in the output"
  - "The a11y job runs in ci.yml on every PR using the build artifact"
description: "Add a test (Playwright + @axe-core/playwright, or a lighter static runner if it covers the need) that serves dist/ and runs axe against every HTML page with WCAG 2.2 A and AA tags in both light and dark themes, failing on any violation with a readable report naming page, rule, and selector. Wire it into ci.yml as an a11y job that depends on the build artifact. Add npm run test:a11y for local use."
lastModified: "2026-09-01T22:18:19.915Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
