---
id: "df48d791-f7b7-45c2-8451-a41fd3b5b652"
level: "task"
title: "Implement Mistral adapter"
status: "pending"
priority: "medium"
tags:
  - "providers"
  - "mistral"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "Fixture-backed tests cover success with usage and ttfbMs, rate limit, and malformed response"
  - "bench:smoke --provider mistral succeeds live"
  - "Normalization row for Mistral is complete"
description: "Write src/providers/mistral.ts against Mistral's chat completions API, taking the API key and fetch from AdapterContext (the CLI supplies MISTRAL_API_KEY), with streaming for ttfbMs and usage mapping to the Usage shape. Reuse the openai-compatible helper if it exists and fits. Fixtures for success, 429, malformed body. Verify the model ID against current Mistral docs and fill the normalization row."
lastModified: "2026-09-01T18:55:34.402Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
