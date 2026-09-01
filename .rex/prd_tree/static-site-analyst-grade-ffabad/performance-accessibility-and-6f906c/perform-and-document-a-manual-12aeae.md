---
id: "12aeae0d-1828-41b0-b922-6dd5d79a31d6"
level: "task"
title: "Perform and document a manual keyboard and screen-reader accessibility pass"
status: "completed"
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
startedAt: "2026-09-01T22:51:19.123Z"
completedAt: "2026-09-01T22:51:19.123Z"
endedAt: "2026-09-01T22:51:19.123Z"
resolutionType: "code-change"
resolutionDetail: "PARTIAL BY NECESSITY — the automated half is done and one real defect was found and fixed; the screen-reader half cannot be done by me and is documented as outstanding rather than claimed. scripts/a11y-audit.mjs (npm run test:audit) verifies across all 17 pages: skip link is the first tab stop, every interactive element has a computed focus indicator, no skipped heading levels, no horizontal overflow at 320px or at 200% zoom, and verdict badges retain border+text in forced-colors mode. It found 24px of horizontal overflow on report pages at 320px (grid minmax with bare rem minimums) — fixed with minmax(min(Xrem,100%),1fr). docs/a11y-checklist.md is dated 2026-09-01, records tooling versions and exactly what each check covers, lists the design decisions that constrain future changes, and contains an explicit \"What still needs a person\" section with seven specific screen-reader questions (reading order, chart-summary usefulness, table navigation, live-region announcement, landmark navigation, disclosure discoverability, link purpose in context) that no automated tool can answer. Requires a human with VoiceOver/NVDA to complete.</resolutionDetail>\n"
acceptanceCriteria:
  - "docs/a11y-checklist.md records a dated pass covering keyboard, screen reader, 200% zoom, 320px reflow, and forced-colors for every page"
  - "All issues found are either fixed in the same PR or filed as issues linked from the checklist"
  - "Verdict badges and charts remain distinguishable in forced-colors mode"
description: "Walk every page with keyboard only (tab order, focus visibility, skip link, theme toggle, table sorting and filtering, chart table disclosures, previous/next links) and with at least one screen reader (VoiceOver on macOS at minimum) checking landmark navigation, heading outline, card reading order, chart summaries, live region announcements, and link purpose. Check 200% zoom and 320px width for reflow, and forced-colors mode for the verdict badges and charts. Record findings and fixes in docs/a11y-checklist.md with date, tools, and browser versions, and fix anything found."
lastModified: "2026-09-01T22:51:19.135Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
