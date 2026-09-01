---
id: "25502428-d2a1-4683-9e3b-24aace53f534"
level: "feature"
title: "Report pages: executive summary, KPI tiles, and per-model vendor profiles for each question"
status: "completed"
priority: "high"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "9d9cc82c-b23a-4464-b841-156c9e6d396a"
source: "ndx-capture"
startedAt: "2026-09-01T22:15:56.580Z"
completedAt: "2026-09-01T22:15:56.580Z"
endedAt: "2026-09-01T22:15:56.580Z"
acceptanceCriteria:
  - "/reports/<questionId>/ exists for every enabled question and the home page links to all of them with the hot dog report first"
  - "Each report renders masthead, executive summary, KPI tiles, and one vendor profile per model with every metric listed or a dash for null values, plus error states"
  - "Verdict is conveyed by text and icon in addition to color and profiles are readable by a screen reader in a sensible order"
  - "Table view is a semantic table that works without JavaScript; sorting and filtering enhance it when JavaScript is available and total client JS for the page stays under 15 KB gzipped"
description: "The core report experience, one page per stored question at /reports/<questionId>/ with the home page presenting the report set and leading with the hot dog report. Each report opens with a masthead (report title, edition/week, \"prepared by\" line, document number), an executive summary paragraph generated at build time in deadpan analyst prose, a KPI tile row (models evaluated, consensus verdict and share, median latency, median output tokens, instruction compliance rate), then a per-model section of vendor profiles: verdict, verbatim answer, input and output tokens, median latency and time to first token, tokens per second, cost estimate, one-word compliance, and a clear error state for failed models. A semantic table view of the same data with progressive-enhancement sorting and filtering by provider and verdict, fully functional without JavaScript. Verdicts are conveyed by text and icon, never color alone."
lastModified: "2026-09-01T22:15:56.589Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Build per-model vendor profile cards with verdict, answer, tokens, speed, cost, and error states](./build-per-model-vendor-profile-7023a8.md) | completed |
| [Build report masthead, executive summary, and KPI tile row per question](./build-report-masthead-executive-755556.md) | completed |
| [Build semantic results table with progressive-enhancement sorting and filtering](./build-semantic-results-table-634ddc.md) | completed |
