---
id: "76c3857d-2381-4823-8b5a-e4231973a750"
level: "feature"
title: "Site copy driven by the registries, so a non-sandwich question set renders correctly"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "oss"
source: "ndx-work session 2026-09-01"
acceptanceCriteria:
  - "questions.json entries carry the claim the framings assert, and the framing labels, board copy and methodology derive from it"
  - "A build test over a scratch questions.json and conditions.json about a different subject produces a site with no sandwich text outside the archive data"
  - "The shipped registries still produce the current copy exactly"
description: "Find every place the site assumes sandwiches: the framing button labels (\"Tell them a hot dog is a sandwich\"), the About and methodology copy, the tally words, the alignment grid glyphs, the fork-block pitch, the OG cards, and the feeds. Drive them from questions.json (a per-question `claim` such as \"is a sandwich\" and its negation) and conditions.json (label and description), with sandwich text as the shipped defaults. A build test renders the site over a scratch registry about burritos and asserts no sandwich text leaks."
lastModified: "2026-09-02T03:50:26.971Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
