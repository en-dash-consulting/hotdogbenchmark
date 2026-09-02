---
id: "363bccb1-a033-491a-b0ff-0e844eb30b44"
level: "epic"
title: "Engaging report site: interactive exploration within the zero-JavaScript-by-default budget"
status: "pending"
priority: "high"
tags:
  - "site"
  - "dataviz"
  - "engagement"
source: "ndx-work session 2026-09-01 (user brief: the most engaging, immersive, interactive benchmarking app, without being feature-rich)"
acceptanceCriteria:
  - "Every interactive feature degrades to a complete, readable static view with JavaScript disabled, verified by a build-output test"
  - "Site-wide client JavaScript stays under the 30 KB gzipped budget enforced by scripts/js-budget.mjs, and the /run/ bundle stays excluded"
  - "Zero axe violations across every page in both themes after each feature lands"
  - "No feature adds a dependency: interactivity is vanilla TypeScript islands like the existing results-table enhancement"
description: "The brief from the maintainer: make the web app the most engaging, immersive, interactive benchmarking report a reader could wish for, without becoming feature-rich. The first slice shipped with the conditions epic: a front page that states the field's position and framing-sensitivity headline, a position-by-framing matrix, verbatim answers under every framing behind <details>, per-framing full reports, and an edition-wide sensitivity chart, all with zero client JavaScript.\n\nWhat remains is the interactive layer, and the constraint that keeps it honest: the 30 KB gzipped client JavaScript budget (currently 918 bytes), progressive enhancement only (every view must be complete without JavaScript), the analyst register (no emoji, no playful iconography), axe-clean in both themes, and build-time SVG with data-table alternatives. Interactivity should let a reader interrogate the same numbers the static page already shows, never load new data the page does not contain.\n\nCandidate features are listed as children. Each is independently shippable; none should be built at the expense of the constraints above."
lastModified: "2026-09-02T01:40:22.061Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Framing explorer: focus one vendor across the matrix, chart, and verbatim answers](./framing-explorer-focus-one-fdf106.md) | pending |
| [Framing sensitivity over time on the history page](./framing-sensitivity-over-time-a4b0ea.md) | pending |
| [Hover and focus detail on every chart without JavaScript](./hover-and-focus-detail-on-every-07b92a.md) | pending |
| [Reasoning made visible: show thinking as a phase, a cost, and a variable](./reasoning-made-visible-show-67daa7.md) | in_progress |
| [Replay the edition: an animated timeline of the week's calls, from recorded timings](./replay-the-edition-an-animated-127d59.md) | pending |
