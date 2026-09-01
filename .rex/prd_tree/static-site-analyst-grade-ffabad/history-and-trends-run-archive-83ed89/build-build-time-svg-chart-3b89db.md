---
id: "3b89db7d-29bc-4f78-98b9-944b66aaa050"
level: "task"
title: "Build build-time SVG chart components for verdict share and per-model trends with table fallbacks"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "dataviz"
  - "a11y"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
  - "cd84a5a1-91b1-4d96-8ff9-4fba90da9e13"
source: "ndx-capture"
acceptanceCriteria:
  - "StackedShare and Sparkline render deterministic SVG for a fixture dataset, verified by snapshot tests"
  - "Every chart has role img, an aria-label summarizing the data, and an adjacent data table with identical values"
  - "Verdict series are distinguishable without color via labels or patterns"
  - "Chart components ship zero client JavaScript"
description: "Create src/site/components/charts/ with pure Astro/TypeScript SVG generators (no client JS, no charting library): StackedShare (verdict share per week), Sparkline (per-model median latency and output tokens across weeks), and a shared scale utility. Each chart emits an SVG with role img and an aria-label summary, direct labels or patterns rather than color-only encoding, and is paired with a visually hidden or disclosure-toggled data table containing the same numbers. Follow the dataviz skill guidance for palette and mark specs. Unit test the scale utility and snapshot the SVG for a fixture dataset."
lastModified: "2026-09-01T18:46:39.249Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
