---
id: "b4b675bb-f3e9-4b2d-b68a-58bba48c8aa8"
level: "feature"
title: "WCAG 2.2 criteria without an automated check: focus not obscured, target size, forced colors, text spacing"
status: "pending"
priority: "high"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "105fe096-263e-40a6-bb63-030442ff3f6f"
source: "ndx-capture"
acceptanceCriteria:
  - "Tabbing through every page never leaves the focused element under the sticky masthead, verified by a Playwright test comparing the focused element's bounding box to the header's"
  - "A test over the built site asserts every interactive element is at least 24 by 24 CSS px and every primary control at least 44 by 44 at 375px wide"
  - "Under forced-colors: active, every verdict chip, answer word, pill, bar segment and chart series remains distinguishable, verified by axe plus a screenshot review in the PR"
  - "A text-spacing bookmarklet-equivalent stylesheet applied in a test produces no clipped or overlapping text on any page"
  - "The focus indicator is visible on every ground the site uses, with the ring color chosen per ground and contrast-tested in tokens.test"
description: "The criteria axe cannot see. Focus Not Obscured (2.4.11): the masthead is sticky, so scroll-padding-top must clear it and no focused element may sit under it, including after in-page anchor jumps. Target Size (2.5.8): every pointer target at least 24 by 24 CSS px with spacing, and primary controls (nav pills, framing buttons, tabs, toggle) at least 44 by 44 on touch. Forced Colors: the site must stay legible when Windows High Contrast replaces every color, which means borders on things that currently rely on background fills (verdict chips, the answer word, the thinking bar, tally items, pills) and `forced-color-adjust` decisions for the charts' pattern fills. Text Spacing (1.4.12): the layout must survive 200% line height, 0.12em letter spacing, 0.16em word spacing and 2× paragraph spacing without clipping. Focus Appearance: a 3px focus ring with 3:1 contrast on every ground, including the navy hero and the fork block. Dragging Movements and Consistent Help do not apply and are recorded as such."
lastModified: "2026-09-02T03:47:22.444Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
