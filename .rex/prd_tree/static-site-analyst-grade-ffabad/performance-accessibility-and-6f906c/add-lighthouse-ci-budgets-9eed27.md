---
id: "9eed27a8-206c-41af-82fe-2b1a7e94ba11"
level: "task"
title: "Add Lighthouse CI budgets, client JavaScript size budget, and layout-shift checks"
status: "completed"
priority: "medium"
tags:
  - "performance"
  - "ci"
blockedBy:
  - "b17721fe-2713-447d-b7c6-3af7be8e481a"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
source: "ndx-capture"
startedAt: "2026-09-01T22:47:27.863Z"
completedAt: "2026-09-01T22:47:27.863Z"
endedAt: "2026-09-01T22:47:27.863Z"
resolutionType: "code-change"
resolutionDetail: "lighthouserc.json asserts performance, accessibility, best-practices and SEO at minScore 0.95 plus CLS maxNumericValue 0 across the home page, the hot dog report, the history page and how-it-works; wired as a lighthouse job in ci.yml consuming the build artifact. Actual measured scores: 100/100/96/100 with CLS 0.000 on all four pages. scripts/js-budget.mjs gives fast local feedback by summing gzipped client JS (emitted files plus the worst single page's inline scripts, excluding the feature-flagged /run/ bundle) against a 30 KB budget, printing a per-file breakdown; the site currently ships 918 bytes. Fixed a real bug in that script where an absent --budget-kb flag produced NaN and silently disabled the check; it now validates the value and is verified to fail at a lowered threshold.</resolutionDetail>\n"
acceptanceCriteria:
  - "lhci runs in ci.yml and fails when any of the four categories drops below 0.95 on the four audited pages"
  - "A build-time script fails when gzipped client JavaScript in dist/ exceeds 30 KB and prints the per-file breakdown"
  - "Home and report page CLS is 0 and no image or SVG lacks explicit dimensions"
description: "Add Lighthouse CI (lhci) configuration asserting performance, accessibility, best-practices, and SEO scores of at least 0.95 on the home page, the hot dog report page, the history page, and the how-it-works page, plus a budgets.json capping total script transfer at 30 KB and Cumulative Layout Shift at 0. Add a small build-time check that sums gzipped JS in dist/ (excluding the feature-flagged /run/ page bundle) and fails above budget so contributors get fast feedback without running Lighthouse. Optimize as needed: preload the self-hosted fonts, set explicit dimensions on SVGs and images, inline critical CSS if it helps."
lastModified: "2026-09-01T22:47:27.874Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
