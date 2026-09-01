---
id: "83ed89c5-fa1b-4943-a34d-55e7d380a7dd"
level: "feature"
title: "History and trends: run archive, week-over-week charts, and flip-flop tracker"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "dataviz"
  - "a11y"
blockedBy:
  - "9d9cc82c-b23a-4464-b841-156c9e6d396a"
  - "37f720dc-0d58-4047-91a0-fa67ea5878ed"
source: "ndx-capture"
startedAt: "2026-09-01T22:27:59.386Z"
completedAt: "2026-09-01T22:27:59.386Z"
endedAt: "2026-09-01T22:27:59.386Z"
acceptanceCriteria:
  - "Every run in data/index.json gets a /runs/<isoWeek>/ page covering all questions in that run and /history/ links to all of them newest first"
  - "Verdict-share and per-model latency and token charts are rendered per question as inline SVG at build time with a visually hidden or toggleable data table alternative"
  - "Position-changes section lists models whose majority verdict changed between consecutive runs for each question, or a professional empty state when none did"
  - "Charts pass axe, use direct labels or patterns rather than color alone, and ship no client JavaScript"
description: "Everything about time, per question. A statically generated archive page per run at /runs/<isoWeek>/ reusing the report components for every question in that run, a /history/ page (with a question selector rendered as plain links) showing build-time SVG charts: verdict share over time as a stacked bar, per-model latency and output-token sparklines with deltas, each paired with an accessible data table and aria descriptions, and a \"Position changes\" section (the analyst-speak name for flip-floppers) highlighting models whose verdict changed between consecutive weeks. Follow dataviz accessibility rules: no color-only encoding, patterns or direct labels, sensible axis labels, respects reduced motion. Visual language matches the analyst-report design system."
lastModified: "2026-09-01T22:27:59.396Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Build build-time SVG chart components for verdict share and per-model trends with table fallbacks](./build-build-time-svg-chart-3b89db.md) | completed |
| [Build the /history/ page with per-question trend charts and the Position Changes tracker](./build-the-history-page-with-per-7e82c1.md) | completed |
| [Generate a static archive page per run at /runs/[isoWeek]/](./generate-a-static-archive-page-c92c61.md) | completed |
