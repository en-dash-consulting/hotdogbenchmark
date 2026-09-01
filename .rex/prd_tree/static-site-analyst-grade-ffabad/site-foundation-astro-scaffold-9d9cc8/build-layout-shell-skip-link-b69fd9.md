---
id: "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
level: "task"
title: "Build layout shell: skip link, header navigation, theme toggle, footer, and base metadata"
status: "in_progress"
priority: "high"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "24d567a1-dafe-450c-af88-728724aaee10"
source: "ndx-capture"
startedAt: "2026-09-01T22:05:15.425Z"
acceptanceCriteria:
  - "Every page has exactly one h1, header/nav/main/footer landmarks, a working skip link, and aria-current on the active nav item"
  - "Layout renders without horizontal scrolling at 320px, 768px, and 1440px widths"
  - "Footer shows the latest run's isoWeek and publish date and links to the GitHub repository"
  - "/about/ exists, ends with the plain-language educational disclosure, and the base layout passes axe with zero violations"
description: "Create src/site/layouts/Base.astro with html lang, viewport, title and description props, canonical URL, OpenGraph defaults, and the theme pre-hydration script. Structure: skip link to main, a masthead-style header with a restrained text wordmark (no icon or illustration) and nav (Reports, History, Methodology, How it works, About) with aria-current on the active page, the theme toggle button, main landmark, footer with GitHub repository link, licence note, and \"Data as of <isoWeek>, published <date>\" pulled from data. Responsive from 320px up with no horizontal scroll. Add an About page written in the same analyst register that, in its final paragraph, plainly states the project's educational purpose."
lastModified: "2026-09-01T22:05:15.441Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
