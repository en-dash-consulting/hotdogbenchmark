---
id: "07b92abb-177a-499c-a082-9daf7a43119a"
level: "feature"
title: "Hover and focus detail on every chart without JavaScript"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "dataviz"
  - "a11y"
source: "ndx-work session 2026-09-01"
acceptanceCriteria:
  - "Every plotted mark has a <title> with the vendor and its values, and is reachable by keyboard"
  - "Hover or focus visibly emphasises the mark and its label using CSS only, with a visible focus ring"
  - "Each mark links to the corresponding vendor profile anchor on the same page"
  - "Axe-clean in both themes and no change to the JavaScript budget"
description: "The quadrant, sensitivity bars, stacked share and sparklines are static images. Give each mark a native SVG <title> and a keyboard-focusable wrapper (an <a> to the vendor's profile anchor) so hovering or tabbing reveals the exact values and Enter jumps to the vendor's card. CSS-only emphasis via :hover/:focus-within on the mark and its label. Zero JavaScript; it also makes every chart mark a link into the evidence, which is the immersive part."
lastModified: "2026-09-02T01:41:13.533Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
