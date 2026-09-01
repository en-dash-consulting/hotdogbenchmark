---
id: "7e7bc1b4-2fd3-4d90-a01f-240bf1eecafd"
level: "task"
title: "Implement OpenAI adapter"
status: "pending"
priority: "high"
tags:
  - "providers"
  - "openai"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "Fixture-backed tests cover success with usage and ttfbMs, rate limit, and malformed response"
  - "reasoningTokens and cachedInputTokens are populated when present in the vendor usage payload"
  - "Usage-normalization table row for OpenAI is complete and bench:smoke --provider openai succeeds live"
description: "Write src/providers/openai.ts following the Anthropic adapter's structure against OpenAI's current chat/responses API with streaming and usage reporting enabled, taking the API key and fetch from AdapterContext (the CLI supplies OPENAI_API_KEY), mapping prompt_tokens/completion_tokens (or the current field names) plus reasoning and cached token details to the Usage shape, and translating errors to ProviderError. Record fixtures for success, 429, and malformed body. Verify the model ID in models.json against current OpenAI docs and fill in the usage-normalization table row."
lastModified: "2026-09-01T18:55:24.455Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
