---
id: "42e34384-f95d-4345-984a-b47c6861aa4e"
level: "task"
title: "Add the feature-flagged /run/ stub page describing the planned Run Your Own capability"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "site"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
source: "ndx-capture"
acceptanceCriteria:
  - "With RUN_YOUR_OWN_ENABLED unset or false, dist/ contains no /run/ page and no nav entry, proven by a build test"
  - "With the flag true, /run/ renders the explanation, key-handling commitments, CLI link, and a disabled sign-in control and passes axe"
  - "The flag is documented in .env.example and docs/self-hosting.md"
description: "Add RUN_YOUR_OWN_ENABLED to the site's env configuration (default false) and src/site/pages/run.astro that is only emitted when the flag is true. The stub page, written in the analyst register, explains that signed-in En Dash users will be able to run the benchmark on their own research question with their own provider keys, states the key-handling commitments (session only, proxy only, never persisted), links to the CLI quickstart as the current path, and shows a disabled sign-in control. Add a nav entry only when the flag is on. Add a build test proving the page and nav entry are absent when the flag is off."
lastModified: "2026-09-01T18:56:06.757Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
