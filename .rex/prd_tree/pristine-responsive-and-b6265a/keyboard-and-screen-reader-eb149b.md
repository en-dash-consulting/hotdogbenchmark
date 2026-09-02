---
id: "eb149b9b-f9d2-49f1-b330-7526a6baa5f7"
level: "feature"
title: "Keyboard and screen-reader experience of the answer board and framing switch"
status: "completed"
priority: "critical"
tags:
  - "site"
  - "a11y"
  - "engagement"
blockedBy:
  - "105fe096-263e-40a6-bb63-030442ff3f6f"
source: "ndx-capture"
startedAt: "2026-09-02T04:41:02.528Z"
completedAt: "2026-09-02T05:11:05.929Z"
endedAt: "2026-09-02T05:11:05.929Z"
resolutionType: "code-change"
resolutionDetail: "AnswerBoard question buttons are a WAI-ARIA tablist and framing buttons a radiogroup, with arrow-key roving focus (Home/End too), aria-selected/aria-checked state, a tabpanel wrapper that keeps the rows' list semantics, and one polite live region that batches landings to a sentence a second and announces framing changes with the system prompt and tally. tests/site/board-keyboard.test.ts drives it by keyboard in Playwright (roles and states, arrow navigation, framing switch and announcement, Tab never lands on a hidden element). axe: 0 violations across 100 checks. Commit 2e08aaa."
acceptanceCriteria:
  - "Question tabs and framing buttons follow the WAI-ARIA tablist and radiogroup patterns with arrow-key navigation, verified by a Playwright keyboard test"
  - "Landings and framing switches are announced through one polite live region, rate-limited so a replay produces at most one announcement per row plus the tally"
  - "Decorative elements (thinking dots, stamps, bars) are aria-hidden and every fact they convey is present as text"
  - "Focus is preserved across re-render of the rows and never lands on a hidden element"
  - "A VoiceOver and an NVDA walkthrough of the board are recorded in docs/a11y-checklist.md with no blocking findings"
description: "The front page's interactive board is the most-used thing on the site and the least tested by assistive technology. Make it exemplary: the question tabs and framing buttons become proper tab and radio-group patterns with arrow-key movement and roving tabindex; the replay announces meaningful milestones through the existing live region (each landing as \"Grok 4.6: No, after 12.6 seconds\", and the tally at the end) without flooding a screen reader; the framing switch announces how many changed their mind; the thinking dots and stamps are decorative and hidden from the accessibility tree while the text they duplicate is exposed; reduced-motion users get the final state immediately, which already happens, plus a static description of what the replay would have shown; focus stays put when rows are re-rendered; and the board is fully usable with no pointer at all. The same treatment applies to the results-table enhancement on report pages and to the condition nav."
lastModified: "2026-09-02T05:11:05.942Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
