---
id: "1ef3a25d-fe4d-46a2-b018-e9ef88c3c1ff"
level: "feature"
title: "A history page that says something with one edition: spread across samples and models"
status: "in_progress"
priority: "high"
tags:
  - "site"
  - "history"
  - "dataviz"
source: "ndx-work session 2026-09-01"
startedAt: "2026-09-02T04:02:20.231Z"
acceptanceCriteria:
  - "With one edition, the question history page renders a per-model consistency strip (one chip per sample per framing) and a latency spread strip, with data-table alternatives"
  - "When data/runs/superseded/ holds runs for the same week, a run-over-run section lists what changed between runs, using the existing positionChanges logic"
  - "The empty-state notice for trends remains but sits below the single-edition content"
  - "Unit tests cover the consistency and spread calculations, including a model with a partial sample set"
description: "With a single edition the question history page shows two empty-state notices. It has plenty to show: per model, how consistent its three samples were (a consistency strip: three chips per model per framing), the spread of latency across samples (min to max, not just the median), and across models (a dot strip on one axis), and the run-over-run view from superseded runs of the same week when they exist. The trend charts stay for when there are two editions, but the page should never read as empty."
lastModified: "2026-09-02T04:02:20.245Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
