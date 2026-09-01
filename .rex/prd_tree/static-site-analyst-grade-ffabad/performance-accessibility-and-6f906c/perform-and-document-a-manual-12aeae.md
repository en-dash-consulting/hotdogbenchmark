---
id: "12aeae0d-1828-41b0-b922-6dd5d79a31d6"
level: "task"
title: "Perform and document a manual keyboard and screen-reader accessibility pass"
status: "pending"
priority: "medium"
tags:
  - "a11y"
blockedBy:
  - "fc7369f4-a33d-47f4-a561-138b2d954d90"
  - "9eed27a8-206c-41af-82fe-2b1a7e94ba11"
  - "634ddc20-50b0-4fdd-beb2-49bb764b0131"
  - "a26c2f97-e3d2-49b7-8281-f440a3593646"
  - "2e7947eb-8777-4ad6-ac9e-227251af919e"
  - "be5bfe9d-d2fb-48f0-a407-3f89e003f5be"
source: "ndx-capture"
acceptanceCriteria:
  - "docs/a11y-checklist.md records a dated pass covering keyboard, screen reader, 200% zoom, 320px reflow, and forced-colors for every page"
  - "All issues found are either fixed in the same PR or filed as issues linked from the checklist"
  - "Verdict badges and charts remain distinguishable in forced-colors mode"
description: "Walk every page with keyboard only (tab order, focus visibility, skip link, theme toggle, table sorting and filtering, chart table disclosures, previous/next links) and with at least one screen reader (VoiceOver on macOS at minimum) checking landmark navigation, heading outline, card reading order, chart summaries, live region announcements, and link purpose. Check 200% zoom and 320px width for reflow, and forced-colors mode for the verdict badges and charts. Record findings and fixes in docs/a11y-checklist.md with date, tools, and browser versions, and fix anything found."
lastModified: "2026-09-01T18:56:44.413Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
