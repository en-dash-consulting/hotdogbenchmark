---
id: "81ecf516-5bd7-456a-8de5-544ba629cfaa"
level: "task"
title: "Write the docs/tutorial series: build a simple LLM benchmark in seven steps"
status: "completed"
priority: "medium"
tags:
  - "docs"
blockedBy:
  - "6d8676b6-9031-42f8-be35-82aee8fc19b9"
  - "276e25f4-d1dd-4115-b85e-bb0e2723445c"
  - "a5315449-f666-4e50-82b3-481a997fd268"
source: "ndx-capture"
startedAt: "2026-09-01T22:59:06.238Z"
completedAt: "2026-09-01T22:59:06.238Z"
endedAt: "2026-09-01T22:59:06.238Z"
resolutionType: "code-change"
resolutionDetail: "docs/tutorial/ contains README.md plus eight numbered pages 00-intro through 07-present-honestly, matching the required outline: decide what you measure, write one adapter, normalize usage and time it, add a second provider, run with samples/concurrency/failure tolerance, persist versioned data, automate on a schedule, and present honestly. Each page names the implementing source files, links them, includes excerpts of the real decisions, and ends with an exercise that involves breaking something and observing the failure. Cross-linked from README, CONTRIBUTING and the How It Works page. tests/docs.test.ts link-checks every markdown file in the repo and asserts the series has eight pages, each linking a source file, ending with an exercise, and linking the next page, with an index listing all of them.</resolutionDetail>\n"
acceptanceCriteria:
  - "docs/tutorial contains eight numbered markdown pages matching the outline, each linking to at least one implementing source file"
  - "Every page ends with an exercise and a link to the next page"
  - "README and the How it works page link to the tutorial index"
  - "A markdown link checker in CI passes for docs/"
description: "Create docs/tutorial/00-intro.md through 07-present-honestly.md: (1) decide what you measure and why a silly fixed prompt is a good first benchmark, (2) write one adapter against one provider, (3) normalize usage and time it (ttfb vs total), (4) add a second provider and discover the differences, (5) run with samples, bounded concurrency, and partial-failure tolerance, (6) persist versioned data and validate it, (7) automate on a schedule and publish, and how to present results without overclaiming. Each page links to the exact file that implements the concept in this repo, includes a short excerpt, and ends with an exercise (e.g. add a second prompt, add a provider, change the sample count). Cross-link from README and the How it works page."
lastModified: "2026-09-01T22:59:06.251Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
