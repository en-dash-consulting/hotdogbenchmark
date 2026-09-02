---
id: "57ade3dd-0163-4813-82ac-0e88d6eee2b4"
level: "feature"
title: "CONTRIBUTING sections and issue templates for adding a provider, a model, and a question"
status: "pending"
priority: "medium"
tags:
  - "docs"
  - "oss"
source: "ndx-work session 2026-09-01"
acceptanceCriteria:
  - "CONTRIBUTING.md has the three sections, each pointing at one file and one verifying command"
  - "Issue templates for add-a-model and add-a-question exist and pass tests/issue-templates.test.ts"
  - "The docs link test passes"
description: "CONTRIBUTING.md gains three short sections, each naming the single file to change and the command that verifies it (a provider: one adapter file plus a registry line and a recorded fixture; a model: one models.json entry and bench:record; a question: one questions.json entry and re-recorded fixtures). GitHub issue templates for \"add a model\" and \"add a question\" ask for exactly the fields the registries need, and the existing issue-templates test covers them."
lastModified: "2026-09-02T03:50:31.094Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
