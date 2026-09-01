---
id: "c92c6196-5164-4b5a-84d6-a0c47f8c3879"
level: "task"
title: "Generate a static archive page per run at /runs/[isoWeek]/"
status: "completed"
priority: "medium"
tags:
  - "site"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "75555630-d090-4b12-b917-a846ff03ee38"
source: "ndx-capture"
startedAt: "2026-09-01T22:27:49.643Z"
completedAt: "2026-09-01T22:27:49.643Z"
endedAt: "2026-09-01T22:27:49.643Z"
resolutionType: "code-change"
resolutionDetail: "src/site/pages/runs/[isoWeek].astro renders every question in an edition via getStaticPaths over all runs, and runs/[isoWeek]/[questionId].astro renders a single archived report using the full report component set under the Masthead's archived-edition banner. Previous/next edition links degrade to plain text at the boundaries. /runs/ indexes every edition newest first with per-edition question and model counts and a sample-data marker. Canonical URLs are per-page and self-referential, so search engines index an archive page as its own document. Build emits 14 pages; all pass axe in both themes.</resolutionDetail>\n"
acceptanceCriteria:
  - "Build emits one page per run plus one page per run × question and a /runs/ index, verified by a build test against fixture data"
  - "Archive pages show the archived-edition banner and working previous/next links at the boundaries"
  - "Canonical URL on an archive page points to itself and on /reports/<questionId>/ to itself"
  - "Archive pages pass axe"
description: "Add src/site/pages/runs/[isoWeek].astro using getStaticPaths over data/index.json, rendering every question in that run with the report components (masthead, executive summary, KPI tiles, vendor profiles) under an \"Archived edition\" banner with previous/next edition links. Also add /runs/[isoWeek]/[questionId]/ for a single archived report. The home page and /reports/<questionId>/ always show the latest run. Add a /runs/ index listing every edition newest first with per-question tallies. Ensure canonical URLs are correct so search engines prefer the latest report pages."
lastModified: "2026-09-01T22:27:49.656Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
