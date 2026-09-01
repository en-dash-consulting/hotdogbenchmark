---
id: "1cdf1558-34d4-442a-8fa8-5f96e7e87efb"
level: "task"
title: "Implement Google Gemini adapter"
status: "pending"
priority: "high"
tags:
  - "providers"
  - "google"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "Fixture-backed tests cover success with usageMetadata and ttfbMs, rate limit, and an empty-candidates response mapped to bad_response"
  - "thoughtsTokenCount maps to reasoningTokens and the normalization row states its inclusion semantics"
  - "bench:smoke --provider gemini succeeds live"
description: "Write src/providers/gemini.ts against the Gemini API (generateContent / streamGenerateContent), taking the API key and fetch from AdapterContext (the CLI supplies GOOGLE_API_KEY), mapping usageMetadata (promptTokenCount, candidatesTokenCount, thoughtsTokenCount → reasoningTokens, cachedContentTokenCount → cachedInputTokens) to the Usage shape, handling the case where safety filtering returns no text as a bad_response error, and translating errors. Fixtures for success, 429, and empty candidates. Verify the model ID against current Google docs and fill the normalization row, noting whether thoughts tokens are included in candidates count."
lastModified: "2026-09-01T18:55:28.180Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
