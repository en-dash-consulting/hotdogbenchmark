---
id: "a8712422-5288-4e9d-8bec-3108919a919b"
level: "feature"
title: "Bring-your-own-keys custom question runner UI"
status: "completed"
priority: "low"
tags:
  - "deferred"
  - "site"
  - "byok"
blockedBy:
  - "e51955ab-f899-43e1-8f38-9e91de50f32a"
source: "ndx-capture"
startedAt: "2026-09-01T23:20:09.344Z"
completedAt: "2026-09-01T23:20:09.344Z"
endedAt: "2026-09-01T23:20:09.344Z"
acceptanceCriteria:
  - "Keys entered in the UI exist only in memory or sessionStorage, are cleared on sign-out, and are sent only to the proxy origin, verified by tests and a network audit"
  - "A signed-in user can run a custom question across selected models and see a full report rendered client-side with the unofficial banner"
  - "The downloaded run JSON validates against the shared schema and nothing is written to data/ or committed"
  - "The flow is keyboard and screen-reader accessible with live progress announcements and passes axe"
description: "The signed-in experience on /run/: enter provider keys (held in memory or sessionStorage only, cleared on sign-out, never sent anywhere but the proxy), type a custom question (with the one-word-answer template optionally appended), choose models, and run. The browser runner uses the same core and adapters with fetch pointed at the proxy, shows live per-model progress, and renders the result with the same report components (masthead, KPI tiles, quadrant, leaderboard, vendor profiles) under a persistent banner stating the run is unofficial and unpublished. Results can be downloaded as a schema-valid run JSON for local use but are never written to data/."
lastModified: "2026-09-01T23:20:09.356Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Build the sign-in, key entry, question, and model selection form on /run/](./build-the-sign-in-key-entry-d0c121.md) | completed |
| [Run the benchmark in the browser through the proxy and render the report client-side](./run-the-benchmark-in-the-cf6dba.md) | completed |
