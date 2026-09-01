---
id: "86fb9a65-080e-408d-8eae-b984e8cfa71e"
level: "task"
title: "Implement timing instrumentation and document cross-provider usage normalization"
status: "pending"
priority: "high"
tags:
  - "providers"
  - "docs"
blockedBy:
  - "32695d3a-6911-4207-a27c-973b9cd576f2"
source: "ndx-capture"
acceptanceCriteria:
  - "measure() returns Timing with totalMs always set and ttfbMs set only when markFirstToken was called, covered by tests"
  - "Usage shape enforces inputTokens and outputTokens as non-negative integers and allows null reasoningTokens and cachedInputTokens"
  - "docs/usage-normalization.md contains a per-provider mapping table with a column stating whether reasoning tokens are included in outputTokens for that vendor"
  - "The document explains in plain language why token counts are not directly comparable across vendors"
description: "In src/providers/timing.ts implement a measure() helper that wraps an adapter call, records startedAt and totalMs using performance.now(), and exposes a markFirstToken() callback so streaming adapters can populate ttfbMs. Define the normalizeUsage(providerId, rawUsage) contract each adapter follows: inputTokens and outputTokens are required; reasoningTokens and cachedInputTokens are nullable and, when reported by the vendor, are surfaced separately and documented as to whether they are included in outputTokens/inputTokens by that vendor. Write docs/usage-normalization.md with a per-provider mapping table (vendor field name → Usage field, plus inclusion semantics), to be filled in as each adapter lands."
lastModified: "2026-09-01T18:43:02.660Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
