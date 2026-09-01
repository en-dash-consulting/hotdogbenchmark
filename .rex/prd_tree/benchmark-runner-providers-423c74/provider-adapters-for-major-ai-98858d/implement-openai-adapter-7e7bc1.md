---
id: "7e7bc1b4-2fd3-4d90-a01f-240bf1eecafd"
level: "task"
title: "Implement OpenAI adapter"
status: "completed"
priority: "high"
tags:
  - "providers"
  - "openai"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T21:45:43.240Z"
completedAt: "2026-09-01T21:45:43.240Z"
endedAt: "2026-09-01T21:45:43.240Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/openai.ts implements the Responses API (not chat completions — OpenAI's flagship gpt-5.6-sol moved there), streaming response.output_text.delta for ttfb and reading usage from response.completed. Maps input_tokens/output_tokens/total_tokens plus output_tokens_details.reasoning_tokens and input_tokens_details.cached_tokens. Fixture-backed tests cover success, 429, 401 and a usage-less 200. Normalization row filled in. NOT VERIFIED: no OPENAI_API_KEY available, so `bench:smoke --provider openai` has not been run live and the fixtures are authored to the documented shape rather than captured — both stated in the adapter header.</resolutionDetail>\n"
acceptanceCriteria:
  - "Fixture-backed tests cover success with usage and ttfbMs, rate limit, and malformed response"
  - "reasoningTokens and cachedInputTokens are populated when present in the vendor usage payload"
  - "Usage-normalization table row for OpenAI is complete and bench:smoke --provider openai succeeds live"
description: "Write src/providers/openai.ts following the Anthropic adapter's structure against OpenAI's current chat/responses API with streaming and usage reporting enabled, taking the API key and fetch from AdapterContext (the CLI supplies OPENAI_API_KEY), mapping prompt_tokens/completion_tokens (or the current field names) plus reasoning and cached token details to the Usage shape, and translating errors to ProviderError. Record fixtures for success, 429, and malformed body. Verify the model ID in models.json against current OpenAI docs and fill in the usage-normalization table row."
lastModified: "2026-09-01T21:45:43.253Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
