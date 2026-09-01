---
id: "c92c6196-5164-4b5a-84d6-a0c47f8c3879"
level: "task"
title: "Generate a static archive page per run at /runs/[isoWeek]/"
status: "pending"
priority: "medium"
tags:
  - "site"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "75555630-d090-4b12-b917-a846ff03ee38"
source: "ndx-capture"
acceptanceCriteria:
  - "Build emits one page per run plus one page per run × question and a /runs/ index, verified by a build test against fixture data"
  - "Archive pages show the archived-edition banner and working previous/next links at the boundaries"
  - "Canonical URL on an archive page points to itself and on /reports/<questionId>/ to itself"
  - "Archive pages pass axe"
description: "Add src/site/pages/runs/[isoWeek].astro using getStaticPaths over data/index.json, rendering every question in that run with the report components (masthead, executive summary, KPI tiles, vendor profiles) under an \"Archived edition\" banner with previous/next edition links. Also add /runs/[isoWeek]/[questionId]/ for a single archived report. The home page and /reports/<questionId>/ always show the latest run. Add a /runs/ index listing every edition newest first with per-question tallies. Ensure canonical URLs are correct so search engines prefer the latest report pages."
lastModified: "2026-09-01T18:54:59.741Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
