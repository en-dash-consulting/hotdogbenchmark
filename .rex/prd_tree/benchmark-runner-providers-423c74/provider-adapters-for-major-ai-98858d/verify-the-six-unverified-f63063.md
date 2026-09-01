---
id: "f6306363-de1f-46ef-a7ca-cf5442a668a1"
level: "task"
title: "Verify the six unverified adapters with live smoke calls"
status: "pending"
priority: "high"
tags:
  - "providers"
  - "verification"
source: "ndx-work session 2026-09-01"
acceptanceCriteria: []
description: "Six of the seven adapters were built and unit-tested against fixtures authored to each vendor's documented wire format, but never exercised against the live API, because only XAI_API_KEY was available in the environment where they were written. xAI is fully verified: a live bench:smoke call succeeds and its committed fixture is a genuine captured stream.\n\nFor each of anthropic, openai, gemini, mistral, deepseek and llama-hosted: obtain a key, run `npm run bench:smoke -- --provider &lt;id&gt;`, confirm text/usage/timing come back correctly, then replace the authored fixture with a real capture via `npm run bench:record -- --provider &lt;id&gt;` and remove the \"fixtures are authored, not captured\" caveat from that adapter's header comment.\n\nAlso confirm each provider's row in docs/usage-normalization.md against what the live response actually contains, and change its Status column from \"Documented\" to \"Verified &lt;date&gt;\". The xAI row is the model to follow: verifying it live revealed that reasoning tokens sit outside completion_tokens and that total_tokens is not the sum of its parts, which no amount of reading the docs had surfaced. Expect at least one similar surprise among the remaining six.</description>\n<parameter name=\"acceptanceCriteria\">[\"bench:smoke succeeds live for all seven providers, not just xai\", \"Every fixture under tests/fixtures/wire/ is a real captured response and no adapter header still claims its fixtures are authored\", \"Every row in docs/usage-normalization.md reads 'Verified <date>' rather than 'Documented'\", \"Any discrepancy found between documented and actual wire format is fixed in the adapter and noted in its header\"]"
lastModified: "2026-09-01T21:46:31.970Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
