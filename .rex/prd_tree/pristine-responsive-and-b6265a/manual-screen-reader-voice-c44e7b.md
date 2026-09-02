---
id: "c44e7b3c-55c4-4128-96ca-b41f8866c313"
level: "feature"
title: "Manual screen-reader, voice-control and touch pass, written up"
status: "pending"
priority: "high"
tags:
  - "site"
  - "a11y"
  - "docs"
blockedBy:
  - "cb0c7462-cff9-42be-9cfc-009c3694d4e0"
source: "ndx-capture"
acceptanceCriteria:
  - "docs/a11y-checklist.md records each pass with tool, browser, date, script followed, and findings, and has no unanswered questions"
  - "Every finding rated serious or worse is fixed and links its commit"
  - "An /accessibility/ page states the WCAG 2.2 AA target, the test methods and dates, and a contact for problems, and is linked from the footer"
  - "The build-output test asserts the accessibility page exists and links the checklist"
description: "Automation proves the absence of known defects; a person proves the site is usable. A scripted pass of the front page, one report page, the history page and the methodology page with VoiceOver on macOS Safari, NVDA on Windows Firefox, VoiceOver on iOS, Voice Control on macOS (\"click Tell them a hot dog is a sandwich\"), and a touchscreen at 375px. Each pass follows the same script: reach the board, replay it, switch framing, find Grok's verbatim answer, open the data table for a chart, change the theme, and get back to the top. Findings go into docs/a11y-checklist.md with severity, the fix, and the commit, and the seven open questions in that document are answered with a date and method. A short accessibility statement page on the site states the conformance target, what was tested and how, and where to report problems."
lastModified: "2026-09-02T03:47:27.108Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
