---
id: "5b12186e-bc43-46da-b3f5-6d76f585e0dc"
level: "task"
title: "Add the GA4 tag once the measurement ID exists"
status: "completed"
priority: "low"
tags:
  - "launch"
  - "analytics"
source: "ndx-capture"
startedAt: "2026-09-02T14:10:54.929Z"
completedAt: "2026-09-02T14:10:54.929Z"
endedAt: "2026-09-02T14:10:54.929Z"
resolutionType: "code-change"
resolutionDetail: "Base.astro emits the gtag snippet only when PUBLIC_GA_MEASUREMENT_ID is set at build and matches the G- shape; deploy.yml reads it from the repository variable of that name, which holds Nick's ID and is never committed. scripts/js-budget.mjs excludes the tag by its data-analytics marker and says why. tests/site/feature-flag.test.ts covers unset, set, and malformed. Verified live: the home page references gtag/js?id=G-KWT27FVE30."
acceptanceCriteria:
  - "With PUBLIC_GA_MEASUREMENT_ID unset the build contains no gtag markup; with it set the tag appears on every page with that ID"
  - "The JS budget script documents how the tag is treated"
  - "The ID Nick supplies is set in the deploy workflow's environment, never committed"
description: "Add the GA4 gtag snippet to Base.astro, reading the G- measurement ID from an environment variable at build (PUBLIC_GA_MEASUREMENT_ID) so forks get no analytics unless they set one. Do not invent an ID; this task waits for Nick to supply it. Keep the JS budget test honest: exclude the tag from the budget count by host, or accept it in the budget and say so in the budget script's comment."
lastModified: "2026-09-02T14:10:54.942Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
