---
id: "cf6dba5b-f371-4739-aaa9-5f838314b7b6"
level: "task"
title: "Run the benchmark in the browser through the proxy and render the report client-side"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "site"
  - "byok"
  - "runner"
source: "ndx-capture"
acceptanceCriteria:
  - "A signed-in user with at least one key can run a custom question and see a complete client-rendered report with the unofficial banner, verified end to end against a mocked proxy in Playwright"
  - "Progress is announced via a live region and a proxy 429 or provider error is shown per model without aborting the run"
  - "Downloaded JSON validates against the shared schema and nothing is written to data/ or committed"
  - "The rest of the site's client JavaScript budget is unaffected, verified by the existing size check"
description: "Wire the browser bundle of runBenchmark to the form: construct an AdapterContext whose fetch routes through the proxy's /v1/forward with the session cookie, run selected models with live per-model progress (queued, running, sample n of N, done, error) announced through a polite live region, then render the result using the same report components (masthead, executive summary, KPI tiles, quadrant, leaderboard, vendor profiles) hydrated client-side for this page only, under a persistent banner reading that the run is unofficial and unpublished. Offer \"Download run JSON\" (schema-valid) and \"Clear results\". Handle partial failures and proxy 429s gracefully. Keep this page's JavaScript separate so the rest of the site keeps its zero-JS budget."
lastModified: "2026-09-01T18:56:36.075Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
