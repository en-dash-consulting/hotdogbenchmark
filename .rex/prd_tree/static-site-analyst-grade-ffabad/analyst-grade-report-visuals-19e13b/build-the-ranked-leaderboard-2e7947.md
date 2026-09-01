---
id: "2e7947eb-8777-4ad6-ac9e-227251af919e"
level: "task"
title: "Build the ranked leaderboard with composite scores and week-over-week rank deltas"
status: "pending"
priority: "high"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "bbacecf7-cd4a-47b8-b0de-f2474736fc80"
source: "ndx-capture"
acceptanceCriteria:
  - "Leaderboard renders for each question from the latest run with correct ranks and deltas against the previous run, verified by a test using two fixture runs"
  - "Rank change is conveyed by icon plus text and a new vendor shows 'new' rather than a numeric delta"
  - "Table has caption, scoped headers, tabular numerals, and a methodology footnote link; page passes axe"
description: "Create src/site/components/report/Leaderboard.astro: a semantic table per question ranking vendors by compositeScore with columns for rank, rank change vs the previous run (up/down/new/unchanged conveyed by icon and text), vendor, verdict, decisiveness, efficiency, median latency, output tokens, and composite score, with tabular numerals and a footnote linking to the scoring methodology. Ties broken deterministically and documented. Add src/site/lib/rank.ts with unit tests for ranking and delta computation including new and missing vendors."
lastModified: "2026-09-01T18:53:58.147Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
