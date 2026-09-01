---
id: "24d567a1-dafe-450c-af88-728724aaee10"
level: "task"
title: "Define analyst-report design tokens, typography, light/dark themes, focus and motion styles"
status: "in_progress"
priority: "high"
tags:
  - "site"
  - "design"
  - "a11y"
blockedBy:
  - "dae0505e-dafa-4f48-b7ab-183f42a5d318"
source: "ndx-capture"
startedAt: "2026-09-01T22:01:59.202Z"
acceptanceCriteria:
  - "All semantic color pairs meet WCAG 2.2 AA (4.5:1 text, 3:1 UI) in both themes, verified by an automated contrast test over tokens.css"
  - "Categorical chart palette has at least six distinguishable series in both themes and passes the dataviz palette validator"
  - "Metrics render with tabular numerals and the display/text font pairing is self-hosted and preloaded"
  - "Theme follows system preference by default, the toggle overrides and persists it, no flash of incorrect theme occurs, and prefers-reduced-motion disables non-essential animation"
description: "Create src/site/styles/tokens.css with CSS custom properties for a restrained corporate palette (deep navy or charcoal primary, cool neutrals, one muted accent for emphasis, and a categorical chart palette per the dataviz skill), semantic color roles (bg, surface, text, muted, accent, verdict-yes, verdict-no, verdict-other, error, chart-1..chart-6) defined for light on :root and overridden under prefers-color-scheme: dark and [data-theme=\"dark\"]. Editorial typography: a serif or high-quality humanist sans display face paired with a clean text face (self-hosted, font-display: swap, preloaded) and tabular numerals for all metrics; fluid type scale via clamp(); generous spacing scale; hairline rules; minimal radii; subtle shadows. Nothing playful: no hotdog iconography, no emoji, no rounded blobs. Global focus-visible ring, reduced-motion media query that disables non-essential animation. Implement a theme toggle that persists to localStorage, is a real button with aria-pressed, and avoids a flash of wrong theme via an inline pre-hydration script."
lastModified: "2026-09-01T22:01:59.221Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
