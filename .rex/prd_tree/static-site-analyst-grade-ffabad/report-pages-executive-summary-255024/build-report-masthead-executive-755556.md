---
id: "75555630-d090-4b12-b917-a846ff03ee38"
level: "task"
title: "Build report masthead, executive summary, and KPI tile row per question"
status: "pending"
priority: "high"
tags:
  - "site"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
source: "ndx-capture"
acceptanceCriteria:
  - "Masthead, executive summary, and KPI tiles render for each enabled question from the latest run and a build-time test checks the numbers against the data"
  - "Executive summary prose is generated from templates in src/site/lib/prose.ts with unit tests covering unanimous, split, and all-error outcomes"
  - "KPI tiles show week-over-week deltas when a prior run exists and omit them cleanly when it does not"
  - "No decorative or playful imagery appears; a run marked isMock displays a sample-data notice"
description: "Create src/site/components/report/Masthead.astro (reportTitle from questions.json, edition label from isoWeek and date, a document reference number derived from runId, \"Prepared by\" line naming the project, and the exact question rendered as a formal \"Research question\" callout), ExecutiveSummary.astro (two or three sentences of templated analyst prose generated at build time from the data: consensus verdict and share, dissenting vendors, fastest and most verbose vendors, compliance rate; templates live in src/site/lib/prose.ts with unit tests and must read as straight-faced industry analysis), and KpiTiles.astro (models evaluated, consensus verdict with share, median latency, median output tokens, instruction compliance rate, each with a week-over-week delta when a prior run exists). Compose them at the top of src/site/pages/reports/[questionId].astro and build the home page as a report index leading with hot-dog. If the latest run is marked isMock, show a discreet \"sample data\" notice in the masthead."
lastModified: "2026-09-01T18:52:27.896Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
