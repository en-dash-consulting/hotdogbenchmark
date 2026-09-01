---
id: "fce91e19-2437-4a0a-ad3e-c0224616e8a0"
level: "feature"
title: "Learn pages: how it works, methodology and caveats, add a model"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "docs"
blockedBy:
  - "9d9cc82c-b23a-4464-b841-156c9e6d396a"
source: "ndx-capture"
acceptanceCriteria:
  - "/how-it-works/ renders a pipeline diagram with a text alternative, code excerpts kept in sync with source via build-time includes, and links to each source file on GitHub"
  - "/methodology/ covers latency definition, ttfb vs total, sampling and medians, token counting differences, non-determinism, and cost estimate disclaimers"
  - "/add-a-model/ gives the exact steps and file paths to add a provider or model and links to the issue template"
  - "All learn pages pass axe with zero violations and use proper heading hierarchy"
description: "The educational half of the site. \"How it works\" walks the pipeline (models.json → adapters → runner → data/runs → site build → GitHub Actions cron → Pages) with an inline diagram, short code excerpts of the ProviderAdapter interface and a real adapter, and deep links to source on GitHub. \"Methodology and caveats\" explains honestly what is and is not being measured: latency includes network from a GitHub runner in an unknown region, time to first token vs total, why three samples and medians, provider token counting differences including reasoning and cached tokens, non-determinism, and that cost figures are estimates from a dated pricing table. \"Add a model\" mirrors CONTRIBUTING for people who arrive via the site."
lastModified: "2026-09-01T18:42:29.303Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Write the Add a model page](./write-the-add-a-model-page-c7a8e1.md) | pending |
| [Write the How it works page with pipeline diagram and live code excerpts](./write-the-how-it-works-page-a53154.md) | pending |
| [Write the Methodology and caveats page](./write-the-methodology-and-d47391.md) | pending |
