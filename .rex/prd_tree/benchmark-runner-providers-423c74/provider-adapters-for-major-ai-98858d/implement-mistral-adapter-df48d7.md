---
id: "df48d791-f7b7-45c2-8451-a41fd3b5b652"
level: "task"
title: "Implement Mistral adapter"
status: "completed"
priority: "medium"
tags:
  - "providers"
  - "mistral"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T21:45:55.941Z"
completedAt: "2026-09-01T21:45:55.941Z"
endedAt: "2026-09-01T21:45:55.941Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/mistral.ts built on the shared openai-compatible helper; streaming with usage, standard prompt/completion token mapping, reasoning and cached tokens null (not reported by this vendor). Fixture-backed tests for success, 429, 401 and usage-less 200. Model id mistral-large-3-25-12 verified against docs.mistral.ai/inference/pricing on 2026-09-01; normalization row filled in. NOT VERIFIED: no MISTRAL_API_KEY available, so bench:smoke has not been run live and the fixture is authored to the documented shape.</resolutionDetail>\n"
acceptanceCriteria:
  - "Fixture-backed tests cover success with usage and ttfbMs, rate limit, and malformed response"
  - "bench:smoke --provider mistral succeeds live"
  - "Normalization row for Mistral is complete"
description: "Write src/providers/mistral.ts against Mistral's chat completions API, taking the API key and fetch from AdapterContext (the CLI supplies MISTRAL_API_KEY), with streaming for ttfbMs and usage mapping to the Usage shape. Reuse the openai-compatible helper if it exists and fits. Fixtures for success, 429, malformed body. Verify the model ID against current Mistral docs and fill the normalization row."
lastModified: "2026-09-01T21:45:55.956Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
