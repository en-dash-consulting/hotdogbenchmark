---
id: "9eed27a8-206c-41af-82fe-2b1a7e94ba11"
level: "task"
title: "Add Lighthouse CI budgets, client JavaScript size budget, and layout-shift checks"
status: "pending"
priority: "medium"
tags:
  - "performance"
  - "ci"
blockedBy:
  - "b17721fe-2713-447d-b7c6-3af7be8e481a"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
source: "ndx-capture"
acceptanceCriteria:
  - "lhci runs in ci.yml and fails when any of the four categories drops below 0.95 on the four audited pages"
  - "A build-time script fails when gzipped client JavaScript in dist/ exceeds 30 KB and prints the per-file breakdown"
  - "Home and report page CLS is 0 and no image or SVG lacks explicit dimensions"
description: "Add Lighthouse CI (lhci) configuration asserting performance, accessibility, best-practices, and SEO scores of at least 0.95 on the home page, the hot dog report page, the history page, and the how-it-works page, plus a budgets.json capping total script transfer at 30 KB and Cumulative Layout Shift at 0. Add a small build-time check that sums gzipped JS in dist/ (excluding the feature-flagged /run/ page bundle) and fails above budget so contributors get fast feedback without running Lighthouse. Optimize as needed: preload the self-hosted fonts, set explicit dimensions on SVGs and images, inline critical CSS if it helps."
lastModified: "2026-09-01T18:56:48.557Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
