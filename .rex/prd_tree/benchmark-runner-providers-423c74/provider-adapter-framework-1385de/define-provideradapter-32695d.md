---
id: "32695d3a-6911-4207-a27c-973b9cd576f2"
level: "task"
title: "Define ProviderAdapter interface, CompleteResult shape, and adapter registry"
status: "completed"
priority: "critical"
tags:
  - "providers"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
startedAt: "2026-09-01T21:29:01.513Z"
completedAt: "2026-09-01T21:31:28.500Z"
endedAt: "2026-09-01T21:31:28.500Z"
resolutionType: "code-change"
resolutionDetail: "src/providers/types.ts exports ProviderAdapter, AdapterContext, CompleteRequest, CompleteResult and ProviderError with per-field doc comments, plus DEFAULT_RETRYABLE, categoryForStatus and toProviderError. src/providers/registry.ts provides registerAdapter/getAdapter/listAdapterIds/overrideAllAdapters and the CLI-only CREDENTIAL_ENV_VARS map (re-exported by src/env.ts, removing the duplicate). getAdapter('gogle') throws naming every registered id. tests/helpers/fake-adapter.ts implements the interface unmodified and is used across the suite. Boundary enforced twice: ESLint no-restricted-imports/properties plus a source-scanning test over src/providers, src/runner and src/schema that also rejects lint suppressions.</resolutionDetail>\n"
acceptanceCriteria:
  - "ProviderAdapter, AdapterContext, CompleteRequest, CompleteResult, and ProviderError are exported with doc comments explaining each field"
  - "getAdapter('nope') throws an error naming every registered provider id"
  - "A fake in-memory adapter used by tests implements the interface without modification, proving it is sufficient"
  - "A lint rule or test fails if any file under src/providers imports a node: builtin or references process.env"
description: "In src/providers/types.ts define ProviderAdapter { id, complete(req: CompleteRequest, ctx: AdapterContext): Promise<CompleteResult> }, AdapterContext { credentials: { apiKey: string }, fetch: typeof fetch, signal: AbortSignal, onFirstToken?: () => void }, CompleteRequest { modelId, prompt, maxOutputTokens, temperature? }, CompleteResult { text, usage: Usage, timing: Timing, raw }, and ProviderError extends Error with category (auth | rate_limit | timeout | server | bad_response | unknown), retryable, providerStatus. Credentials and fetch are injected so the same adapter runs under Node (CLI reads env) and, later, in a browser or edge proxy for the deferred run-your-own-benchmark epic; adapters must never read process.env or import Node-only modules. In src/providers/registry.ts export a registry keyed by provider id with getAdapter(id) that throws a clear error listing known providers, and a credentialEnvVar map (provider id → env var name) used only by the CLI. Keep the interface deliberately tiny and annotate it with doc comments since it is the primary teaching surface."
lastModified: "2026-09-01T21:31:28.514Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
