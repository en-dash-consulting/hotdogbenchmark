---
id: "7e82c123-27e9-4d49-a582-36edf7869722"
level: "task"
title: "Build the /history/ page with per-question trend charts and the Position Changes tracker"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "c92c6196-5164-4b5a-84d6-a0c47f8c3879"
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
source: "ndx-capture"
startedAt: "2026-09-01T22:27:59.313Z"
completedAt: "2026-09-01T22:27:59.313Z"
endedAt: "2026-09-01T22:27:59.313Z"
resolutionType: "code-change"
resolutionDetail: "src/site/pages/history/index.astro plus history/[questionId].astro compose StackedShare for verdict share per edition and a grid of Sparklines for per-model median latency and output tokens, each showing the current value and a delta from the prior edition. A question selector rendered as plain links (aria-current on the active one) switches between questions. The Position Changes section lists models whose majority verdict changed between consecutive editions, linking both editions to their archive pages, with a professional empty state when none did and a separate empty state explaining why trends are unavailable with a single edition. src/site/lib/history.ts carries the logic with 20 tests covering no change, one change, multiple changes, a model missing from one week, a newly added model, and single/zero-edition histories. Zero client JavaScript; passes axe in both themes.</resolutionDetail>\n"
acceptanceCriteria:
  - "/history/ renders the verdict-share chart and per-model sparklines with data-table alternatives for each question from all runs in data/index.json"
  - "Position-change detection is unit tested for no change, one change, multiple changes, and a model missing from one week"
  - "Every edition referenced links to its /runs/<isoWeek>/ page"
  - "Page passes axe and ships zero client JavaScript"
description: "Create src/site/pages/history.astro (and /history/[questionId]/ for a single question) composing the chart components per question: verdict share per edition (StackedShare), a per-model grid of latency and output-token sparklines with the current value and a delta from the previous edition, and a \"Position changes\" section computed at build time listing models whose majority verdict changed between consecutive runs (with both verdicts and the editions), plus a professional empty state for a single run or no changes. A question selector rendered as plain links switches between questions. Link every edition to its archive page. Add a helper in src/site/lib/history.ts with unit tests for change detection and delta calculations."
lastModified: "2026-09-01T22:27:59.326Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
