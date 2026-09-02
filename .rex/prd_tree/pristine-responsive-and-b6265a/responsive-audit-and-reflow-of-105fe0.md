---
id: "105fe096-263e-40a6-bb63-030442ff3f6f"
level: "feature"
title: "Responsive audit and reflow of every page from 320px to 1920px"
status: "pending"
priority: "critical"
tags:
  - "site"
  - "responsive"
source: "ndx-capture"
acceptanceCriteria:
  - "A Playwright test builds the site and asserts document.scrollWidth equals the viewport width on every page at each of the seven widths and at 400% zoom"
  - "Data tables stack into labeled rows below 48rem and remain real tables with headers for assistive technology"
  - "Every SVG chart is legible at 320px wide, with labels that do not collide, verified by screenshot review recorded in the PR"
  - "No fixed pixel widths remain in component CSS except SVG viewBoxes and the brand mark"
  - "The answer board, alignment grid and sway chart read correctly at 320px with no clipped words"
description: "Walk every page at 320, 375, 414, 768, 1024, 1280 and 1920 CSS pixels, portrait and landscape, and at 200% and 400% zoom, and fix what is tolerated rather than designed. Known work: the report data table, leaderboard, position-by-framing matrix and alignment grid fall back to horizontal scrolling on narrow screens and should stack into labeled rows (a `data-label` per cell driven by the header) below a breakpoint; the quadrant, sensitivity bars, radar scorecards and stacked-share SVGs need viewBox-scaled sizing with legible labels at 320px, or a narrow variant; the answer board's timing column should drop under the answer at narrow widths without losing the thinking segment; the hero question scale should be checked at 320 (no orphaned single-character lines) and at 1920 (a max line length); the fork block's command list must wrap or scroll without pushing the page wide; the masthead pill row must not clip the toggle. Every fix is done with fluid units and container-aware layout, not device-specific hacks, and WCAG 1.4.10 reflow (no two-dimensional scrolling at 320 CSS px except for tables and charts, which get a scroll container with keyboard access) is the rule."
lastModified: "2026-09-02T03:46:22.561Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
