---
id: "7e82c123-27e9-4d49-a582-36edf7869722"
level: "task"
title: "Build the /history/ page with per-question trend charts and the Position Changes tracker"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "c92c6196-5164-4b5a-84d6-a0c47f8c3879"
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
source: "ndx-capture"
acceptanceCriteria:
  - "/history/ renders the verdict-share chart and per-model sparklines with data-table alternatives for each question from all runs in data/index.json"
  - "Position-change detection is unit tested for no change, one change, multiple changes, and a model missing from one week"
  - "Every edition referenced links to its /runs/<isoWeek>/ page"
  - "Page passes axe and ships zero client JavaScript"
description: "Create src/site/pages/history.astro (and /history/[questionId]/ for a single question) composing the chart components per question: verdict share per edition (StackedShare), a per-model grid of latency and output-token sparklines with the current value and a delta from the previous edition, and a \"Position changes\" section computed at build time listing models whose majority verdict changed between consecutive runs (with both verdicts and the editions), plus a professional empty state for a single run or no changes. A question selector rendered as plain links switches between questions. Link every edition to its archive page. Add a helper in src/site/lib/history.ts with unit tests for change detection and delta calculations."
lastModified: "2026-09-01T18:55:03.762Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
