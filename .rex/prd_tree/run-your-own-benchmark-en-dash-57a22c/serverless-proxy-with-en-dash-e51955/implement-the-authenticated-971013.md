---
id: "9710135d-d6a7-4a49-ac48-4786f71e954f"
level: "task"
title: "Implement the authenticated provider forward endpoint with allowlist, streaming, and rate limits"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "backend"
  - "security"
source: "ndx-capture"
acceptanceCriteria:
  - "Unauthenticated requests and requests to non-allowlisted hosts are rejected with 401 and 403 respectively, proven by tests"
  - "Streaming upstream responses are relayed incrementally and upstream Set-Cookie headers are stripped"
  - "Per-user and global rate limits return 429 with Retry-After and a log-inspection test proves keys, prompts, and bodies never appear in logs"
  - "docs/proxy.md includes a threat model covering key exposure, SSRF, abuse, and cost"
description: "Add POST /v1/forward that requires a valid session, accepts { provider, url, headers, body } where url must match an allowlisted host per provider, injects nothing and stores nothing, streams the upstream response back (including SSE), strips upstream Set-Cookie headers, and enforces per-user (e.g. 60 requests per 10 minutes) and global rate limits with Retry-After. Logging records only user id, provider, status, and duration, never headers, keys, prompts, or bodies, verified by a test that inspects log output. Add a threat model section to docs/proxy.md covering key exposure, SSRF, abuse, and cost."
lastModified: "2026-09-01T18:56:21.756Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
