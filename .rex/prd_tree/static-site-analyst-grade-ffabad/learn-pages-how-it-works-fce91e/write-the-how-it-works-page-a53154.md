---
id: "a5315449-f666-4e50-82b3-481a997fd268"
level: "task"
title: "Write the How it works page with pipeline diagram and live code excerpts"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "docs"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T22:41:10.618Z"
completedAt: "2026-09-01T22:41:10.618Z"
endedAt: "2026-09-01T22:41:10.618Z"
resolutionType: "code-change"
resolutionDetail: "src/site/pages/how-it-works.astro renders an inline SVG pipeline diagram with a full text alternative in its aria-label, seven numbered steps each deep-linking the implementing file on GitHub, and two code excerpts (the ProviderAdapter interface and the Anthropic stream loop) read from source at build time by src/site/lib/excerpt.ts using #region markers. A missing marker throws, so the build fails rather than shipping a page describing code that no longer exists; a test asserts the excerpted text is present in the built HTML. Passes axe in both themes.</resolutionDetail>\n"
acceptanceCriteria:
  - "Page renders a pipeline diagram with a text alternative and seven numbered steps"
  - "Code excerpts are read from source at build time and a test fails if the marked excerpt regions are missing"
  - "Each step links to the implementing file on GitHub"
  - "Page passes axe and has correct heading hierarchy"
description: "Create src/site/pages/how-it-works.astro: a numbered walkthrough of the pipeline (models.json → ProviderAdapter → runner → data/runs JSON → Astro build → GitHub Actions cron → Pages) with an inline SVG diagram (plus text alternative), code excerpts of the ProviderAdapter interface and the Anthropic adapter pulled from source at build time via a small include helper (so they cannot drift), and links to each file on GitHub at the current commit. Tone: friendly, direct, aimed at a developer who has never called two LLM APIs side by side."
lastModified: "2026-09-01T22:41:10.630Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
