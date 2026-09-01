---
id: "86f8e95e-2993-4f05-836f-984e358634b7"
level: "task"
title: "Implement shared HTTP helper with timeout, retry with backoff, and error normalization"
status: "pending"
priority: "critical"
tags:
  - "providers"
blockedBy:
  - "32695d3a-6911-4207-a27c-973b9cd576f2"
source: "ndx-capture"
acceptanceCriteria:
  - "A request exceeding the timeout throws ProviderError category timeout and the underlying fetch is aborted, proven with fake timers"
  - "429 and 503 responses are retried with growing delays and Retry-After is honored; 401 is not retried and maps to category auth"
  - "Retry logs never contain Authorization or x-api-key header values"
  - "Backoff parameters and retry count are configurable via policy and defaults are documented in the module doc comment"
description: "In src/providers/http.ts implement fetchWithPolicy(url, init, policy) that applies a per-request timeout via AbortController (default 60s, configurable), retries 429 and 5xx with exponential backoff plus jitter up to policy.maxRetries (default 3), honors Retry-After when present, never retries 401/403/400, and throws ProviderError with the right category (auth, rate_limit, timeout, server, bad_response, unknown) and retryable flag. Add toProviderError(unknown) for wrapping SDK errors. Log retries at debug level without ever including headers. Cover with unit tests using a mocked fetch and fake timers."
lastModified: "2026-09-01T18:42:54.549Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
