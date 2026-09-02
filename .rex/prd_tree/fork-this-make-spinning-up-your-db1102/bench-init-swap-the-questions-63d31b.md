---
id: "63d31b54-47a2-450c-ab10-c4a1f7e7d4af"
level: "feature"
title: "bench init: swap the questions and framings interactively and clear stale fixtures"
status: "pending"
priority: "medium"
tags:
  - "cli"
  - "oss"
source: "ndx-work session 2026-09-01"
acceptanceCriteria:
  - "bench init with flags rewrites questions.json and conditions.json to valid registries and clears fixtures, tested end to end in a temporary repo"
  - "Interactive mode is reachable with no flags and can be cancelled without writing anything"
  - "The command refuses to remove real (isMock false) editions without --force"
description: "A non-interactive command first (flags: --question \"Is a burrito a sandwich?\" --subject \"a burrito\" --id burrito, repeatable; --assert \"{subject} is a sandwich.\" --deny \"{subject} is not a sandwich.\"), then an interactive mode when no flags are given. It rewrites questions.json and conditions.json, validates them, clears tests/fixtures/responses (they were recorded for the old questions and mock mode would otherwise fail honestly), removes data/runs editions with confirmation, and prints the next commands. Reads the current registries as defaults so a fork can edit rather than start from nothing."
lastModified: "2026-09-02T03:50:19.567Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
