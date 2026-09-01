---
id: "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
level: "task"
title: "Build per-model vendor profile cards with verdict, answer, tokens, speed, cost, and error states"
status: "completed"
priority: "high"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
source: "ndx-capture"
startedAt: "2026-09-01T22:15:46.668Z"
completedAt: "2026-09-01T22:15:46.668Z"
endedAt: "2026-09-01T22:15:46.668Z"
resolutionType: "code-change"
resolutionDetail: "VendorProfile.astro renders each model as an <article> with a heading so screen readers can navigate model by model: vendor + display name + model id, a verdict badge with glyph and visible text (never colour alone, never emoji), the verbatim answer as a formal quotation, and a definition list of input tokens, output tokens, median latency, ttfb, throughput, cost estimate, samples and instruction compliance. Null values render as an em dash with a reason (\"not reported by this provider\", \"no pricing on file\"). Error cards show category and a short human message, never a stack trace, and state why the entry is retained rather than dropped. Grid reflows from one column at 320px to auto-fill at 18rem minimum. All numbers formatted via Intl with tabular numerals.</resolutionDetail>\n"
acceptanceCriteria:
  - "Each card renders every metric listed with correct units and dashes for null values, verified against a fixture run"
  - "Verdict badge includes an icon and visible text; error cards show category and message only"
  - "Cards are article elements with headings and the grid reflows from one column at 320px to three or more at 1200px"
  - "Home page passes axe with zero violations"
description: "Create src/site/components/report/VendorProfile.astro and a responsive grid within each report page. Each profile: provider and display name styled as a vendor entry, verdict badge with icon plus text (yes / no / other), the verbatim answer presented as a formal quotation, a definition list of metrics: input tokens, output tokens, median latency, time to first token (or a dash with \"not reported\"), tokens per second, cost estimate (or dash with \"no pricing\"), samples count, and an instruction-compliance indicator. Error state shows category and a short human message, never a stack trace. Number formatting via Intl with consistent units and tabular numerals. Profiles are articles with a heading so screen readers can navigate model by model."
lastModified: "2026-09-01T22:15:46.681Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
