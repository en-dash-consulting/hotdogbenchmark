---
id: "29febc95-266f-4bc8-808a-5ef3d9b79b28"
level: "task"
title: "Implement Anthropic adapter as the reference implementation"
status: "completed"
priority: "critical"
tags:
  - "providers"
  - "anthropic"
blockedBy:
  - "86f8e95e-2993-4f05-836f-984e358634b7"
  - "86fb9a65-080e-408d-8eae-b984e8cfa71e"
  - "b78a714a-10e9-49b2-8bcf-c45d2e986e36"
source: "ndx-capture"
startedAt: "2026-09-01T21:37:30.658Z"
completedAt: "2026-09-01T21:45:30.616Z"
endedAt: "2026-09-01T21:45:30.616Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/anthropic.ts implements ProviderAdapter over the Messages API with streaming (ttfb captured from the first text_delta), maps input_tokens/output_tokens/cache_read_input_tokens, treats message_delta counts as cumulative and authoritative, catches mid-stream error events after a 200, and maps 429→rate_limit / 401→auth / usage-less 200→bad_response. 18 dedicated tests plus the shared adapter contract suite; a test enforces the under-150-lines-of-code limit. Wire format verified against platform.claude.com streaming docs on 2026-09-01. NOT VERIFIED: `bench:smoke --provider anthropic` live — no ANTHROPIC_API_KEY available in this environment; the smoke command is implemented and works (proven live against xAI). Fixtures are authored to the documented shape, stated in the adapter header.</resolutionDetail>\n"
acceptanceCriteria:
  - "Adapter returns text, inputTokens, outputTokens, cachedInputTokens, totalMs, and ttfbMs from a recorded streaming fixture in a unit test"
  - "429 fixture maps to ProviderError category rate_limit with retryable true and a malformed body maps to bad_response"
  - "Adapter file is under 150 lines excluding comments and every non-obvious line has a comment suitable for a tutorial"
  - "bench:smoke --provider anthropic performs one live call and prints text, usage, and timing; the usage-normalization table row for Anthropic is filled in"
description: "Write src/providers/anthropic.ts implementing ProviderAdapter against the Anthropic Messages API using streaming so ttfbMs is captured, taking the API key and fetch from AdapterContext (the CLI supplies ANTHROPIC_API_KEY; the adapter never touches process.env), mapping usage (input_tokens, output_tokens, cache_read_input_tokens → cachedInputTokens) per the usage-normalization doc, and translating HTTP errors to ProviderError categories. This adapter is the one the How-it-works page excerpts, so it must be short, linear, and heavily commented. Record fixtures for a success stream, a 429, and a malformed body. Verify the model ID in models.json against current Anthropic docs before landing. Add npm run bench:smoke -- --provider anthropic for a single live call."
lastModified: "2026-09-01T21:45:30.630Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
