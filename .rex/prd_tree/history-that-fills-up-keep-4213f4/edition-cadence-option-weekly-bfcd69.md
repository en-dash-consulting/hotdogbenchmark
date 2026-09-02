---
id: "bfcd69d5-3af7-4c0d-92da-9e9edcad3115"
level: "feature"
title: "Edition cadence option: weekly by default, daily for forks that want a denser record"
status: "completed"
priority: "medium"
tags:
  - "data"
  - "runner"
  - "history"
source: "ndx-work session 2026-09-01"
startedAt: "2026-09-02T04:39:55.752Z"
completedAt: "2026-09-02T04:39:55.752Z"
endedAt: "2026-09-02T04:39:55.752Z"
resolutionType: "code-change"
resolutionDetail: "--cadence week|day and BENCH_CADENCE; editionKey on runs and manifest; loader orders both kinds; formatEdition renders both; docs and tests"
acceptanceCriteria:
  - "bench run --cadence day writes data/runs/YYYY-MM-DD.json with editionKey set, validated by the schema, and the loader orders daily and weekly editions together newest first"
  - "formatEdition and the archive pages label both kinds correctly, with tests"
  - "docs/self-hosting.md documents the option and the cost consequence"
description: "bench run gains --cadence week|day (and BENCH_CADENCE). Daily editions are filed as data/runs/<YYYY-MM-DD>.json and carry an editionKey alongside isoWeek in the run file (an optional, non-breaking field), so the site can order and label both kinds. formatEdition renders \"Week 36, 2026\" or \"September 2, 2026\". The manifest, archive pages, history axes and feeds sort by editionKey. The weekly workflow stays weekly."
lastModified: "2026-09-02T04:39:55.767Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
