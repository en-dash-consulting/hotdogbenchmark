---
id: "6b39227d-4270-492d-ad82-6f2e55be0f88"
level: "task"
title: "Implement DeepSeek adapter"
status: "completed"
priority: "medium"
tags:
  - "providers"
  - "deepseek"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T21:45:59.844Z"
completedAt: "2026-09-01T21:45:59.844Z"
endedAt: "2026-09-01T21:45:59.844Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/deepseek.ts reuses the openai-compatible helper with one genuine override: DeepSeek reports prompt caching as top-level prompt_cache_hit_tokens/prompt_cache_miss_tokens rather than OpenAI's nested prompt_tokens_details.cached_tokens, so extractUsage prefers the hit counter and falls back to the OpenAI-shaped field. That matters here because the same 15-token prompt is sent nine times a week, making cache hits the normal case. Reasoning tokens captured from completion_tokens_details. Fixture-backed tests including the cache-field override. Model id deepseek-v4-pro verified 2026-09-01 (the retired deepseek-chat alias now routes into the v4 family); normalization row filled in. NOT VERIFIED: no DEEPSEEK_API_KEY available, so bench:smoke has not been run live and the fixture is authored to the documented shape.</resolutionDetail>\n"
acceptanceCriteria:
  - "Fixture-backed tests cover success including reasoning and cache token fields, rate limit, and malformed response"
  - "bench:smoke --provider deepseek succeeds live"
  - "Normalization row for DeepSeek is complete"
description: "Write src/providers/deepseek.ts against DeepSeek's OpenAI-compatible API, taking the API key and fetch from AdapterContext (the CLI supplies DEEPSEEK_API_KEY), capturing reasoning tokens for reasoning models and cache hit/miss token fields → cachedInputTokens. Reuse the openai-compatible helper if it fits. Fixtures for success, 429, malformed body. Verify the model ID against current DeepSeek docs and fill the normalization row."
lastModified: "2026-09-01T21:45:59.858Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
