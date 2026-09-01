---
id: "98858d2a-8dad-43f4-99ea-af70c036eecc"
level: "feature"
title: "Provider adapters for major AI vendors"
status: "pending"
priority: "critical"
tags:
  - "providers"
blockedBy:
  - "1385de8d-ce5b-458c-908f-3539ee02242b"
source: "ndx-capture"
acceptanceCriteria:
  - "Seven adapters are registered and each has a fixture-backed unit test covering success, rate-limit error, and malformed response"
  - "Every adapter reports inputTokens and outputTokens from the vendor usage payload and sets reasoningTokens and cachedInputTokens when the vendor exposes them"
  - "Adapters that support streaming populate ttfbMs; others leave it null and the models.json entry says supportsStreaming: false"
  - "A live smoke script (npm run bench:smoke -- --provider <id>) hits the real API once and prints text, usage, and timing for manual verification"
description: "One adapter file per provider implementing ProviderAdapter against the vendor's HTTP API, each with recorded response fixtures and unit tests using a mocked fetch. Initial set: Anthropic, OpenAI, Google Gemini, xAI, Mistral, DeepSeek, and Meta Llama via a hosted provider (Groq or Together). Each adapter maps the vendor's usage payload onto the shared Usage shape per docs/usage-normalization.md, uses streaming when available to capture time to first token, and converts vendor errors into ProviderError categories. Adapters receive credentials and fetch through AdapterContext (the CLI maps env vars such as ANTHROPIC_API_KEY to them); they never read process.env, so they can later run in a browser or edge proxy. Use raw fetch (preferred, since it is isomorphic) or an official SDK only if it is fetch-based and dependency-light; each adapter stays under roughly 150 lines so it remains a teaching example. Model IDs come from models.json, never from the adapter."
lastModified: "2026-09-01T18:51:47.504Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Implement Anthropic adapter as the reference implementation](./implement-anthropic-adapter-as-29febc.md) | in_progress |
| [Implement DeepSeek adapter](./implement-deepseek-adapter-6b3922.md) | pending |
| [Implement Google Gemini adapter](./implement-google-gemini-adapter-1cdf15.md) | pending |
| [Implement hosted Meta Llama adapter via Groq or Together](./implement-hosted-meta-llama-6e98e3.md) | pending |
| [Implement Mistral adapter](./implement-mistral-adapter-df48d7.md) | pending |
| [Implement OpenAI adapter](./implement-openai-adapter-7e7bc1.md) | pending |
| [Implement xAI Grok adapter](./implement-xai-grok-adapter-7f2ec4.md) | pending |
