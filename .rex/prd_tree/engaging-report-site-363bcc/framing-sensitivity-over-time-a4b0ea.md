---
id: "a4b0ea81-cf3b-4928-92a0-8331523aec5a"
level: "feature"
title: "Framing sensitivity over time on the history page"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "dataviz"
  - "history"
source: "ndx-work session 2026-09-01"
acceptanceCriteria:
  - "A sensitivityOverTime() function in history.ts returns one series per vendor with null for control-only editions, unit tested including the gap case"
  - "Sparklines render with the existing Sparkline component and a data-table alternative"
  - "The single-edition empty state explains that a trend needs two multi-condition editions"
  - "No client JavaScript"
description: "Once a second multi-condition edition exists, the history page should show each vendor's edition-wide framing sensitivity as a sparkline alongside the existing latency and token sparklines, plus a table of vendors whose sensitivity changed between consecutive editions in the style of Position changes. Editions with only the control (version-1 files) yield a gap, not a zero. Pure functions in src/site/lib/history.ts, unit tested, build-time SVG only."
lastModified: "2026-09-02T01:41:07.341Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
