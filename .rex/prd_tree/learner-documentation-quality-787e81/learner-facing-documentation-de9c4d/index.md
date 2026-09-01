---
id: "de9c4d57-00b0-4d0d-9ab0-eda878343fd3"
level: "feature"
title: "Learner-facing documentation: README, tutorial series, and provider setup guide"
status: "completed"
priority: "medium"
tags:
  - "docs"
blockedBy:
  - "37f720dc-0d58-4047-91a0-fa67ea5878ed"
  - "f731352d-6d83-410a-b824-39801e15f124"
  - "fce91e19-2437-4a0a-ad3e-c0224616e8a0"
source: "ndx-capture"
startedAt: "2026-09-01T22:59:18.553Z"
completedAt: "2026-09-01T22:59:18.553Z"
endedAt: "2026-09-01T22:59:18.553Z"
acceptanceCriteria:
  - "README contains pitch, live link, screenshot, architecture diagram, quickstart (clone, install, bench run --mock, npm run dev), adding a provider, running the weekly job locally, and a workflow status badge"
  - "docs/tutorial/ has one numbered page per concept, each linking to the implementing source file and ending with a short exercise"
  - "docs/providers.md lists each provider's key acquisition steps, free tier or minimum spend, rate limits relevant to this benchmark, and an estimated weekly cost"
  - "A newcomer following README alone reaches a locally running site with mock data in under ten minutes, verified by a fresh-clone walkthrough recorded in the PR"
description: "Documentation that makes the repo a starting point for people who want to benchmark models themselves. The README becomes complete: pitch, live link, screenshot, architecture diagram, ten-minute quickstart in mock mode, how to add a provider, how to run the weekly job locally, and a status badge. A docs/tutorial series (\"Build a simple LLM benchmark\") walks the concepts in order and maps each to the file that implements it: define what you measure, write an adapter, normalize usage and time it, run with samples and tolerate failure, persist versioned data, automate on a schedule, present it honestly. A provider setup guide covers getting keys, free tiers and rate limits, and realistic weekly cost for this prompt."
lastModified: "2026-09-01T22:59:18.562Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Complete the README: pitch, live link, screenshot, architecture diagram, quickstart, and badges](./complete-the-readme-pitch-live-478d04.md) | completed |
| [Write docs/providers.md: key setup, free tiers, rate limits, and weekly cost expectations](./write-docs-providers-md-key-0910c2.md) | completed |
| [Write the docs/tutorial series: build a simple LLM benchmark in seven steps](./write-the-docs-tutorial-series-81ecf5.md) | completed |
