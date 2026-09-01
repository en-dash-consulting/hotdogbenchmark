---
id: "6d8676b6-9031-42f8-be35-82aee8fc19b9"
level: "task"
title: "Implement --mock mode with recorded fixtures for keyless end-to-end runs"
status: "completed"
priority: "high"
tags:
  - "runner"
  - "dx"
blockedBy:
  - "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
source: "ndx-capture"
startedAt: "2026-09-01T21:52:49.527Z"
completedAt: "2026-09-01T21:58:09.791Z"
endedAt: "2026-09-01T21:58:09.791Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/mock.ts (runtime-agnostic replayer) + src/cli/mock-fixtures.ts (Node-side loader reading BENCH_SEED) + fixtures for all seven providers at tests/fixtures/responses/. `bench run --mock` verified end to end in a temporary repo with every *_API_KEY stripped from the environment, producing a schema-valid run marked isMock:true and a refreshed manifest. BENCH_SEED makes timings deterministic — proven by running twice and diffing (identical apart from runId and wall-clock timestamps). src/cli/record.ts implements bench:record with two redaction defences: only named fields are copied (raw vendor payload never written) and the output is scanned for key-shaped strings before saving; a test scans all committed fixtures for key patterns. README quickstart and CONTRIBUTING both lead with mock mode.</resolutionDetail>\n"
acceptanceCriteria:
  - "bench run --mock succeeds in CI with no provider env vars set and produces a schema-valid run file marked isMock: true"
  - "Mock timing is deterministic when BENCH_SEED is set, proven by running twice and diffing"
  - "bench:record writes a fixture with any key-like strings redacted, verified by a test scanning fixtures for known key prefixes"
  - "CONTRIBUTING and README quickstart both lead with bench run --mock"
description: "Add src/providers/mock.ts, an adapter that replays recorded responses from tests/fixtures/responses/<provider>/<modelId>.json with realistic simulated timing (deterministic when BENCH_SEED is set), and a --mock flag that swaps every registered adapter for the mock without requiring any env keys. Add npm run bench:record -- --provider <id> to capture a fresh fixture from a live call with keys redacted from raw payloads. Document mock mode in CONTRIBUTING and README quickstart as the default first command a newcomer runs."
lastModified: "2026-09-01T21:58:09.804Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
