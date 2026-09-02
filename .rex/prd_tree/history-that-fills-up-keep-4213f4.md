---
id: "4213f4f3-9512-478c-ab52-2c9ab85073a0"
level: "epic"
title: "History that fills up: keep every run, and make one edition worth looking at"
status: "pending"
priority: "high"
tags:
  - "data"
  - "history"
  - "site"
source: "ndx-capture 2026-09-01 (maintainer: \"we should be capturing these runs though at least to start building that up\")"
acceptanceCriteria:
  - "A re-run never deletes the previous run file; it is moved to data/runs/superseded/ with its runId in the name, and data:validate accepts the folder"
  - "The two superseded Week 36 runs from 2026-09-01 are recovered from git history and committed under data/runs/superseded/"
  - "With one edition, the history page for a question renders sample spread and cross-model spread rather than only an empty-state notice"
  - "With two or more editions, verdict share, latency, tokens and framing sensitivity render as trends"
  - "An edition cadence option exists and is documented in self-hosting.md"
description: "The history pages are empty because the archive has one edition, and it has one edition partly because re-running a week overwrites the file. Three runs of Week 36 were made on 2026-09-01 alone (control only, first three-condition run, eleven-model run) and only the last survives in data/runs/. The one-file-per-week rule is right for the published edition and wrong for the raw record.\n\nTwo changes to the data layout, then the views that need them:\n\n- Keep every run. When a week is re-run, the superseded file moves to data/runs/superseded/<isoWeek>-<runId>.json rather than being deleted; the site reads only data/runs/*.json for editions but can read superseded runs for within-week comparison. The two earlier Week 36 runs are recovered from git history into that folder.\n- An edition cadence setting (week, the default, or day) so a fork that wants a daily record can have one without rewriting filenames by hand; isoWeek stays the key for weekly editions and a dated key is added for daily ones.\n\nThen the history views stop being placeholders: run-over-run within a week, verdict share over time once there are two points, framing sensitivity over time (already captured), and a single-edition history page that shows the spread across samples and models rather than an empty-state notice."
lastModified: "2026-09-02T03:23:15.630Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
