---
id: "bbacecf7-cd4a-47b8-b0de-f2474736fc80"
level: "task"
title: "Create questions.json registry with the hot dog, hamburger, and taco questions"
status: "pending"
priority: "critical"
tags:
  - "schema"
  - "data"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
acceptanceCriteria:
  - "questions.json validates and contains enabled hot-dog, hamburger, and taco entries with the exact one-word-answer template text"
  - "A unit test fails on duplicate ids or text that does not end with 'One word answer.'"
  - "loadQuestions() returns enabled entries in file order and the runner and site both consume it rather than a hardcoded prompt"
description: "Add questions.json at the repo root: an ordered list of { id, subject, text, enabled, reportTitle } entries seeded with hot-dog (\"Is a hot dog a sandwich? One word answer.\"), hamburger, and taco. Every text follows the same template so the methodology can state it once; reportTitle is the deadpan analyst-style name used on the site (e.g. \"Sandwich Classification Benchmark: Hot Dog Edition\"). Validate with a zod schema in src/schema/questions.ts, expose loadQuestions() filtering to enabled entries, and enforce unique ids. Document in CONTRIBUTING how to add a question and note that adding one increases weekly cost linearly."
lastModified: "2026-09-01T18:51:28.089Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
