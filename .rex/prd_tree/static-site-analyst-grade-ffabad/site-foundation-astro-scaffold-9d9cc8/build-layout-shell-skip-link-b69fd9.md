---
id: "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
level: "task"
title: "Build layout shell: skip link, header navigation, theme toggle, footer, and base metadata"
status: "completed"
priority: "high"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "24d567a1-dafe-450c-af88-728724aaee10"
source: "ndx-capture"
startedAt: "2026-09-01T22:05:15.425Z"
completedAt: "2026-09-01T22:09:01.019Z"
endedAt: "2026-09-01T22:09:01.019Z"
resolutionType: "code-change"
resolutionDetail: "src/site/layouts/Base.astro provides html lang, viewport, title/description props, canonical, OpenGraph/Twitter defaults, feed links, and the inline pre-hydration theme script. Structure: skip link → masthead with text wordmark and nav (Reports/History/Methodology/How it works/About, aria-current on the active item) → theme toggle → main → footer with GitHub link, licence, and \"Data as of <edition>, published <date>\" pulled from the latest run (plus a Sample data marker when isMock). ThemeToggle.astro is a real button with aria-pressed that persists to localStorage and falls back gracefully when storage throws. /about/ exists and closes with the plain-language educational disclosure. Responsive with a stacking masthead below 40rem. tests/site/build-output.test.ts verifies one h1, landmarks, working skip link, metadata and single aria-current across every built page.</resolutionDetail>\n"
acceptanceCriteria:
  - "Every page has exactly one h1, header/nav/main/footer landmarks, a working skip link, and aria-current on the active nav item"
  - "Layout renders without horizontal scrolling at 320px, 768px, and 1440px widths"
  - "Footer shows the latest run's isoWeek and publish date and links to the GitHub repository"
  - "/about/ exists, ends with the plain-language educational disclosure, and the base layout passes axe with zero violations"
description: "Create src/site/layouts/Base.astro with html lang, viewport, title and description props, canonical URL, OpenGraph defaults, and the theme pre-hydration script. Structure: skip link to main, a masthead-style header with a restrained text wordmark (no icon or illustration) and nav (Reports, History, Methodology, How it works, About) with aria-current on the active page, the theme toggle button, main landmark, footer with GitHub repository link, licence note, and \"Data as of <isoWeek>, published <date>\" pulled from data. Responsive from 320px up with no horizontal scroll. Add an About page written in the same analyst register that, in its final paragraph, plainly states the project's educational purpose."
lastModified: "2026-09-01T22:09:01.032Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
