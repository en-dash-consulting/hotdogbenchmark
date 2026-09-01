---
id: "1385de8d-ce5b-458c-908f-3539ee02242b"
level: "feature"
title: "Provider adapter framework: interface, HTTP helpers, timing, and error normalization"
status: "pending"
priority: "critical"
tags:
  - "runner"
  - "providers"
blockedBy:
  - "5c1c0eae-9ae0-4761-9be7-5fa60222625b"
source: "ndx-capture"
acceptanceCriteria:
  - "src/providers/types.ts exports ProviderAdapter, CompleteRequest, CompleteResult, and ProviderError with a documented error category enum"
  - "Shared fetch helper enforces a per-request timeout, retries 429 and 5xx with backoff and jitter up to a configurable limit, and never retries 4xx auth errors, all covered by unit tests with a mocked fetch"
  - "Timing helper records totalMs for every call and ttfbMs when a streaming adapter yields its first token"
  - "docs/usage-normalization.md defines how reasoning, cached, and total tokens map to the Usage shape for each provider"
description: "The abstraction that makes the project teachable and extensible. A ProviderAdapter interface with a single complete() method returning normalized text, usage, timing, and raw payload; a registry keyed by provider id; shared helpers for timeouts (AbortController), retries with exponential backoff and jitter on 429/5xx, a ProviderError taxonomy (auth, rate_limit, timeout, server, bad_response, unknown), and timing instrumentation that measures wall-clock latency and, where streaming is supported, time to first token. Also defines the usage normalization rules for reasoning and cached tokens so every provider maps onto the same Usage shape."
lastModified: "2026-09-01T18:40:59.772Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Define ProviderAdapter interface, CompleteResult shape, and adapter registry](./define-provideradapter-32695d.md) | pending |
| [Implement shared HTTP helper with timeout, retry with backoff, and error normalization](./implement-shared-http-helper-86f8e9.md) | pending |
| [Implement timing instrumentation and document cross-provider usage normalization](./implement-timing-86fb9a.md) | pending |
