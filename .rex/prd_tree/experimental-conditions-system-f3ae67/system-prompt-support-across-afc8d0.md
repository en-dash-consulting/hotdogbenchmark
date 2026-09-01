---
id: "afc8d03e-cd7c-4e09-9175-3e8856815452"
level: "feature"
title: "System prompt support across all seven adapters"
status: "pending"
priority: "critical"
tags:
  - "providers"
blockedBy:
  - "aca81e46-57cf-419b-8b1c-0fda1414a8bd"
source: "ndx-capture"
acceptanceCriteria:
  - "CompleteRequest carries an optional systemPrompt, documented with the reason each vendor differs"
  - "Each of the seven adapters has a test asserting the system prompt lands in that vendor's correct field, checked against the request body actually sent"
  - "Each adapter has a test asserting the request body is unchanged when no system prompt is set, so the control condition is provably the current behaviour"
  - "docs/usage-normalization.md gains a column recording each vendor's system-prompt mechanism"
  - "The four OpenAI-compatible adapters get this from the shared helper rather than four separate implementations"
description: "`CompleteRequest` gains an optional `systemPrompt`, and every adapter maps it onto its vendor's own mechanism. Every vendor supports this; no two do it the same way.\n\n- **Anthropic** — top-level `system` field on the Messages request, not a message with `role: \"system\"`.\n- **OpenAI (Responses API)** — the `instructions` field.\n- **Gemini** — `systemInstruction`, a `contents`-shaped object rather than a bare string.\n- **OpenAI-compatible** (xAI, Mistral, DeepSeek, Together) — a leading `{ role: \"system\", content }` message, handled once in the shared helper.\n\nThat last point is the payoff for having built the shared helper: four of the seven are one change.\n\nWhen `systemPrompt` is undefined the request body must be **byte-identical to today's**, so the control condition provably measures the same thing the current editions measured and the existing fixtures stay valid. Each adapter's test asserts both directions: the field appears in the right place when set, and the body is unchanged when not."
lastModified: "2026-09-01T23:50:30.538Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
