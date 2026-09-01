---
id: "19e13b45-c9fa-44ba-9a55-6eada6f4bc96"
level: "feature"
title: "Analyst-grade report visuals: quadrant chart, leaderboard, scorecards, key findings, and print edition"
status: "completed"
priority: "high"
tags:
  - "site"
  - "dataviz"
  - "design"
blockedBy:
  - "25502428-d2a1-4683-9e3b-24aace53f534"
  - "83ed89c5-fa1b-4943-a34d-55e7d380a7dd"
source: "ndx-capture"
startedAt: "2026-09-01T22:36:34.107Z"
completedAt: "2026-09-01T22:36:34.107Z"
endedAt: "2026-09-01T22:36:34.107Z"
acceptanceCriteria:
  - "Each report page renders a quadrant chart, a ranked leaderboard with deltas, vendor scorecards with radars, and a key-findings list, all from the latest run data"
  - "Every derived score (composite, decisiveness, efficiency, radar axes) is computed by a pure, unit-tested function and its formula is documented on the methodology page"
  - "Every chart has a data-table alternative, passes axe, uses direct labels or patterns rather than color alone, and ships no client JavaScript"
  - "Each report prints cleanly to A4 and US Letter and a build-time PDF is downloadable from the report page"
description: "The \"bullshit Gartner\" layer that makes each report look like it cost five figures. A magic-quadrant-style scatter per question (working name \"Sandwich Certainty Quadrant\") plotting decisiveness against efficiency with named quadrants, a ranked leaderboard with composite scores and week-over-week rank deltas, per-vendor scorecards with a small radar of normalized metrics, a build-time \"Key findings\" list in analyst prose, and a print stylesheet plus \"Download report\" flow (static PDF generated at build time) so the whole thing can be printed and left on a conference table. All charts are build-time SVG with data-table alternatives, follow the dataviz skill, and every score is defined transparently on the methodology page. The visuals never wink; the words do."
lastModified: "2026-09-01T22:36:34.117Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Add print stylesheet and build-time PDF edition of each report](./add-print-stylesheet-and-build-3ea67a.md) | completed |
| [Build the quadrant chart (Sandwich Certainty Quadrant) with scoring library and data-table fallback](./build-the-quadrant-chart-a26c2f.md) | completed |
| [Build the ranked leaderboard with composite scores and week-over-week rank deltas](./build-the-ranked-leaderboard-2e7947.md) | completed |
| [Build vendor scorecards with radar charts and the build-time Key Findings generator](./build-vendor-scorecards-with-be5bfe.md) | completed |
