---
id: "86f8e95e-2993-4f05-836f-984e358634b7"
level: "task"
title: "Implement shared HTTP helper with timeout, retry with backoff, and error normalization"
status: "completed"
priority: "critical"
tags:
  - "providers"
blockedBy:
  - "32695d3a-6911-4207-a27c-973b9cd576f2"
source: "ndx-capture"
startedAt: "2026-09-01T21:31:50.209Z"
completedAt: "2026-09-01T21:33:56.864Z"
endedAt: "2026-09-01T21:33:56.864Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/http.ts implements fetchWithPolicy with per-attempt AbortController timeout (default 60s), exponential backoff with symmetric jitter (base 500ms, max 20s, ±25%), Retry-After honoured over computed backoff, retries on 429/5xx/transport faults and never on 400/401/403. 37 unit tests with a scripted fetch cover each case; the timeout test uses fake timers and asserts the underlying fetch is genuinely aborted. Retry logging is leak-proof by construction — onRetry receives only method/status/safeUrl, and safeUrl strips the query string since some vendors take a key there; a test asserts no header or query secret appears in the callback payload or thrown message. All backoff parameters are configurable via RetryPolicy and the defaults are tabulated in the module doc comment.</resolutionDetail>\n"
acceptanceCriteria:
  - "A request exceeding the timeout throws ProviderError category timeout and the underlying fetch is aborted, proven with fake timers"
  - "429 and 503 responses are retried with growing delays and Retry-After is honored; 401 is not retried and maps to category auth"
  - "Retry logs never contain Authorization or x-api-key header values"
  - "Backoff parameters and retry count are configurable via policy and defaults are documented in the module doc comment"
description: "In src/providers/http.ts implement fetchWithPolicy(url, init, policy) that applies a per-request timeout via AbortController (default 60s, configurable), retries 429 and 5xx with exponential backoff plus jitter up to policy.maxRetries (default 3), honors Retry-After when present, never retries 401/403/400, and throws ProviderError with the right category (auth, rate_limit, timeout, server, bad_response, unknown) and retryable flag. Add toProviderError(unknown) for wrapping SDK errors. Log retries at debug level without ever including headers. Cover with unit tests using a mocked fetch and fake timers."
lastModified: "2026-09-01T21:33:56.880Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
