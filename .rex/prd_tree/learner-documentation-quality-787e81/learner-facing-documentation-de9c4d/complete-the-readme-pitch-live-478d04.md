---
id: "478d0491-3bce-4852-91bf-d3cce2f33358"
level: "task"
title: "Complete the README: pitch, live link, screenshot, architecture diagram, quickstart, and badges"
status: "completed"
priority: "medium"
tags:
  - "docs"
blockedBy:
  - "6d8676b6-9031-42f8-be35-82aee8fc19b9"
  - "f86235ce-5ae1-40af-9b4a-6c748afa167f"
  - "81ecf516-5bd7-456a-8de5-544ba629cfaa"
  - "0910c270-6b38-4916-907d-ac512efe035b"
source: "ndx-capture"
startedAt: "2026-09-01T22:59:18.481Z"
completedAt: "2026-09-01T22:59:18.481Z"
endedAt: "2026-09-01T22:59:18.481Z"
resolutionType: "code-change"
resolutionDetail: "README contains the pitch and exact question, a live-link placeholder, screenshots in both themes generated from the real built site by scripts/screenshots.mjs (so they cannot become a picture of a design that no longer exists), an ASCII architecture diagram of the pipeline, a quickstart verified to work on a fresh clone with no keys, instructions for running against real providers, how to add a provider, a pointer to self-hosting for running the weekly job, a documentation index, the full script table, an explanation of every dev dependency, and CI/benchmark/deploy status badges plus a licence badge. Link-checked by tests/docs.test.ts. NOT VERIFIED: the badges and live link resolve only once the repository exists on GitHub — there is no git remote in this environment — and the fresh-clone walkthrough timing was not recorded in a PR description since no PR was opened.</resolutionDetail>\n"
acceptanceCriteria:
  - "README contains every section listed in the description with working links verified by a link checker"
  - "Quickstart commands succeed verbatim on a fresh clone and the walkthrough time is recorded in the PR"
  - "CI and benchmark workflow status badges render and point at this repository"
description: "Finish README.md: one-paragraph pitch and the question, live site link, a screenshot of the home page (light and dark), a simple architecture diagram (mermaid or SVG) of the pipeline, a ten-minute quickstart (clone, install, bench run --mock, npm run dev), how to run against real providers (.env, bench run), how to add a provider (link), how to run the weekly job locally and in your fork (link to self-hosting), the docs/tutorial index, workflow status badges for CI and benchmark, license. Do a fresh-clone walkthrough and record the elapsed time in the PR description."
lastModified: "2026-09-01T22:59:18.494Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
