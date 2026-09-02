---
id: "b6265a4a-723c-4442-99e5-3d4630b0e2d4"
level: "epic"
title: "Pristine responsive and accessible site: every page, every width, every input method"
status: "pending"
priority: "critical"
tags:
  - "site"
  - "a11y"
  - "responsive"
  - "quality"
source: "ndx-capture"
acceptanceCriteria:
  - "Every page renders without horizontal scrolling at 320px wide and at 400% zoom on a 1280px viewport, and no content is clipped or overlapping at 320, 375, 414, 768, 1024, 1280 and 1920, verified by a Playwright test over the built site"
  - "Every interactive element is reachable and operable by keyboard alone, in a sensible order, with a visible focus indicator that is never hidden behind the sticky masthead"
  - "A documented screen-reader pass (VoiceOver on macOS and NVDA on Windows) of the front page, one report page, the history page and the methodology page records no blocking issues, and every issue it did find is fixed and linked"
  - "The site is legible and operable in forced-colors mode and with prefers-reduced-motion, verified by axe runs under both settings in CI"
  - "All pointer targets are at least 24 by 24 CSS pixels, and primary controls at least 44, with a test over the built site"
  - "Lighthouse accessibility is 100 on every audited page and the axe run stays at zero violations, both enforced in CI"
  - "docs/a11y-checklist.md has no unanswered questions and states the date and method of each verification"
description: "The maintainer's brief: the entire site must be a pristine example of responsive design and of accessibility. Not \"passes axe\" but the kind of site people point at.\n\nWhere it stands today: axe-core is clean on all 23 pages in both themes; every token pair is contrast-tested to WCAG AA; there is a skip link, landmarks, one h1 per page, a print stylesheet and a tagged PDF; the answer board respects prefers-reduced-motion and announces the tally through a live region; the nav collapses to a scrolling pill row under 52rem. What has never been done: a screen-reader pass (docs/a11y-checklist.md lists seven open questions), a forced-colors (Windows High Contrast) pass, a 400% zoom reflow check at 320 CSS pixels, a target-size check against WCAG 2.2's 24px minimum, a focus-not-obscured check under the sticky masthead, and a proper responsive audit of the report pages, whose wide tables fall back to horizontal scrolling and whose quadrant and scorecard SVGs were designed for desktop.\n\nThe bar is WCAG 2.2 AA everywhere, AAA where it costs nothing (contrast on body text, reduced motion, target size), and a layout that reads as designed rather than tolerated from 320px to 1920px, in portrait and landscape, at 100% through 400% zoom, with a mouse, a keyboard, a screen reader, voice control, and a touchscreen. Automated gates hold the line; a documented manual pass proves it.\n\nChildren carry the specifics, in the order they should land: the responsive audit first, because reflow changes markup that the accessibility passes then test; then keyboard and screen-reader work on the interactive board; then the WCAG 2.2 criteria that have no automated check; then the CI gates; then the manual pass and its write-up."
lastModified: "2026-09-02T03:46:03.233Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [CI gates that hold the responsive and accessibility bar](./ci-gates-that-hold-the-cb0c74.md) | completed |
| [Keyboard and screen-reader experience of the answer board and framing switch](./keyboard-and-screen-reader-eb149b.md) | completed |
| [Manual screen-reader, voice-control and touch pass, written up](./manual-screen-reader-voice-c44e7b.md) | blocked |
| [Responsive audit and reflow of every page from 320px to 1920px](./responsive-audit-and-reflow-of-105fe0.md) | completed |
| [WCAG 2.2 criteria without an automated check: focus not obscured, target size, forced colors, text spacing](./wcag-2-2-criteria-without-an-b4b675.md) | completed |
