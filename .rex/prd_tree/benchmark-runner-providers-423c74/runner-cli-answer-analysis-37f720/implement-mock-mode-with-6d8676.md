---
id: "6d8676b6-9031-42f8-be35-82aee8fc19b9"
level: "task"
title: "Implement --mock mode with recorded fixtures for keyless end-to-end runs"
status: "pending"
priority: "high"
tags:
  - "runner"
  - "dx"
blockedBy:
  - "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
source: "ndx-capture"
acceptanceCriteria:
  - "bench run --mock succeeds in CI with no provider env vars set and produces a schema-valid run file marked isMock: true"
  - "Mock timing is deterministic when BENCH_SEED is set, proven by running twice and diffing"
  - "bench:record writes a fixture with any key-like strings redacted, verified by a test scanning fixtures for known key prefixes"
  - "CONTRIBUTING and README quickstart both lead with bench run --mock"
description: "Add src/providers/mock.ts, an adapter that replays recorded responses from tests/fixtures/responses/<provider>/<modelId>.json with realistic simulated timing (deterministic when BENCH_SEED is set), and a --mock flag that swaps every registered adapter for the mock without requiring any env keys. Add npm run bench:record -- --provider <id> to capture a fresh fixture from a live call with keys redacted from raw payloads. Document mock mode in CONTRIBUTING and README quickstart as the default first command a newcomer runs."
lastModified: "2026-09-01T18:46:05.254Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
