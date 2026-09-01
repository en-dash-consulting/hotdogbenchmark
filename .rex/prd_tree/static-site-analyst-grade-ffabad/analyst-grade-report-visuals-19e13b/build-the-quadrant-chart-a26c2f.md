---
id: "a26c2f97-e3d2-49b7-8281-f440a3593646"
level: "task"
title: "Build the quadrant chart (Sandwich Certainty Quadrant) with scoring library and data-table fallback"
status: "pending"
priority: "high"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "bbacecf7-cd4a-47b8-b0de-f2474736fc80"
source: "ndx-capture"
acceptanceCriteria:
  - "decisiveness, efficiency, and compositeScore are pure functions with unit tests covering edge cases (all errors, single model, identical latencies) and documented formulas"
  - "Quadrant renders deterministic SVG for a fixture run with all vendors labeled and no overlapping labels, verified by snapshot test"
  - "Chart has role img, an aria-label summary, and an adjacent data table with identical values; it passes axe and ships no client JavaScript"
  - "Quadrant names and axis definitions appear on the methodology page"
description: "Create src/site/lib/scores.ts with pure, unit-tested functions: decisiveness (share of samples with a yes or no verdict weighted by instruction compliance), efficiency (normalized inverse of median latency blended with output-token economy), and a compositeScore used by the leaderboard; every formula is documented in a doc comment that the methodology page renders. Create src/site/components/report/Quadrant.astro: a build-time SVG scatter per question plotting efficiency (x) against decisiveness (y) with four named quadrants in analyst register (e.g. Leaders, Challengers, Visionaries, Niche Players equivalents, named without infringing anyone's trademark), vendor labels placed with a simple collision-avoidance pass, median crosshairs, and a caption. Pair it with a data table of the plotted values and an aria-label summary. Follow the dataviz skill for marks, palette, and legend rules."
lastModified: "2026-09-01T18:53:52.512Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
