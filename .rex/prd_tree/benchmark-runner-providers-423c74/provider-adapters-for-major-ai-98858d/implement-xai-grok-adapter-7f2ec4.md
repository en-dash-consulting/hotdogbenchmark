---
id: "7f2ec4c0-312c-46fc-9f17-6e7080a1c3d1"
level: "task"
title: "Implement xAI Grok adapter"
status: "completed"
priority: "medium"
tags:
  - "providers"
  - "xai"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
startedAt: "2026-09-01T21:45:35.129Z"
completedAt: "2026-09-01T21:45:35.129Z"
endedAt: "2026-09-01T21:45:35.129Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/xai.ts is a thin file over the shared openai-compatible helper, which both it and the other OpenAI-dialect adapters use (all tests pass). FULLY VERIFIED LIVE: `npm run bench:smoke -- --provider xai` succeeds against the real API, and the committed success fixture is a genuine captured SSE stream. Model id and pricing confirmed against xAI's live GET /v1/language-models. The live call established that reasoning_tokens are NOT inside completion_tokens (647 prompt + 1 completion + 647 reasoning = 1295 total), and that ttfb must measure the first content token because the stream sends reasoning_content for ~10s first. Normalization row filled in and marked Verified.</resolutionDetail>\n"
acceptanceCriteria:
  - "Fixture-backed tests cover success, rate limit, and malformed response"
  - "If an openai-compatible helper is introduced, both the OpenAI and xAI adapters use it and their tests still pass"
  - "bench:smoke --provider xai succeeds live and the normalization row is complete"
description: "Write src/providers/xai.ts against xAI's OpenAI-compatible chat API, taking the API key and fetch from AdapterContext (the CLI supplies XAI_API_KEY). If the wire format is close enough to OpenAI's, factor a small shared openai-compatible helper rather than duplicating; the adapter itself stays a thin file that sets base URL and any usage-field differences (including reasoning tokens). Fixtures for success, 429, malformed body. Verify the model ID against current xAI docs and fill the normalization row."
lastModified: "2026-09-01T21:45:35.144Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
