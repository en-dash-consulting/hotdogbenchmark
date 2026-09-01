---
id: "6b39227d-4270-492d-ad82-6f2e55be0f88"
level: "task"
title: "Implement DeepSeek adapter"
status: "pending"
priority: "medium"
tags:
  - "providers"
  - "deepseek"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "Fixture-backed tests cover success including reasoning and cache token fields, rate limit, and malformed response"
  - "bench:smoke --provider deepseek succeeds live"
  - "Normalization row for DeepSeek is complete"
description: "Write src/providers/deepseek.ts against DeepSeek's OpenAI-compatible API, taking the API key and fetch from AdapterContext (the CLI supplies DEEPSEEK_API_KEY), capturing reasoning tokens for reasoning models and cache hit/miss token fields → cachedInputTokens. Reuse the openai-compatible helper if it fits. Fixtures for success, 429, malformed body. Verify the model ID against current DeepSeek docs and fill the normalization row."
lastModified: "2026-09-01T18:55:36.475Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
