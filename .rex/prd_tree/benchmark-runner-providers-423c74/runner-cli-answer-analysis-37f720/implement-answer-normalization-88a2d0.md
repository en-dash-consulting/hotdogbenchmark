---
id: "88a2d050-ee6b-461d-9b48-d21d1cc380ad"
level: "task"
title: "Implement answer normalization: verdict classification and one-word compliance"
status: "pending"
priority: "high"
tags:
  - "runner"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
acceptanceCriteria:
  - "Table-driven unit tests cover Yes., \"No\", yes!, Technically yes, It depends, Sandwich, an empty string, and a multi-sentence answer with expected verdict and followedInstruction"
  - "Synonym lists for yes and no are exported constants used by both the runner and the methodology page"
  - "analyzeAnswer never throws on arbitrary input including emoji and non-Latin scripts"
description: "In src/runner/analyze.ts implement analyzeAnswer(text) returning { verdict: yes | no | other, followedInstruction: boolean, normalized: string }. Normalization: trim, strip surrounding quotes and trailing punctuation, collapse whitespace, lowercase for comparison. Verdict rules: \"yes\"/\"yeah\"/\"absolutely\"/\"definitely\" family → yes; \"no\"/\"nope\"/\"never\" family → no; everything else including hedges (\"technically\", \"sometimes\", \"depends\") → other. followedInstruction is true only when the normalized answer is exactly one word. Keep the synonym lists small, explicit, and exported so the methodology page can show them. The verbatim text is always preserved alongside."
lastModified: "2026-09-01T18:43:21.522Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
