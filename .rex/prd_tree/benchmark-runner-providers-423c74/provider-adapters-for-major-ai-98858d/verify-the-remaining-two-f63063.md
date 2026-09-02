---
id: "f6306363-de1f-46ef-a7ca-cf5442a668a1"
level: "task"
title: "Verify the remaining two adapters with live smoke calls"
status: "blocked"
priority: "high"
tags:
  - "providers"
  - "verification"
source: "ndx-work session 2026-09-01"
startedAt: "2026-09-02T00:13:48.705Z"
acceptanceCriteria:
  - "bench:smoke --all reports ok for all seven providers with no skips and no failures"
  - "Every fixture under tests/fixtures/wire/ and tests/fixtures/responses/ is a real captured response, and no adapter header still claims its fixtures are authored"
  - "Every row in docs/usage-normalization.md reads Verified with a date rather than Documented"
  - "DeepSeek's prompt_cache_hit_tokens mapping is confirmed against a real response, since it is the only vendor-specific usage override in the shared helper"
  - "Any discrepancy found between documented and actual behaviour is fixed in the adapter and recorded in the What verifying these live actually changed section"
description: "Five of seven adapters are now verified against live APIs (anthropic, openai, gemini, xai, mistral) — see docs/usage-normalization.md, where each Verified row carries the measurement that established it. Two remain.\n\n**deepseek** — the key authenticates, but the account has no credit: every call returns `402 Payment Required — Insufficient Balance`. Add credit at https://platform.deepseek.com/, then `npm run bench:smoke -- --provider deepseek`. Until then it is recorded in each run as an unavailable provider, which is honest but is not verification.\n\n**llama-hosted** — no `TOGETHER_API_KEY` set. Create one at https://api.together.ai/settings/api-keys and add it to `.env`.\n\nFor each: run the smoke call, confirm text/usage/timing come back, replace the authored fixture with a real capture via `npm run bench:record -- --provider <id>`, remove the \"fixtures are authored to the documented shape\" caveat from that adapter's header comment, and change its row in docs/usage-normalization.md from Documented to Verified with the date.\n\nExpect surprises. Verifying the first five produced four real bugs, none of which any fixture test could have caught: a 64-token output cap that made reasoning models return empty answers, an Anthropic reasoning-token field the adapter asserted did not exist, a Mistral model id that was a documentation slug the API rejects, and confirmation that Gemini counts thoughts outside `candidatesTokenCount`.\n\nTwo specific things to check on these two: whether DeepSeek's `prompt_cache_hit_tokens` override actually fires (the one vendor-specific mapping in the OpenAI-compatible helper, currently unexercised against a real response), and whether Together reports `prompt_tokens_details` at all."
lastModified: "2026-09-02T01:56:49.397Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
