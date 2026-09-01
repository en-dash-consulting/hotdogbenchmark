---
id: "f3ae6700-9c3d-4652-b00d-647fa7c1b269"
level: "epic"
title: "Experimental conditions: system prompts and framing as benchmark arms"
status: "pending"
priority: "high"
tags:
  - "conditions"
  - "runner"
  - "schema"
  - "site"
source: "ndx-capture"
acceptanceCriteria:
  - "conditions.json is a validated registry seeded with at least a control condition (no system prompt) and an assertion condition whose system prompt contradicts the expected answer; adding a condition requires no code change"
  - "bench run executes the full condition x question x model matrix and writes results carrying conditionId; the run file validates against schema version 2"
  - "Every one of the seven adapters sends the system prompt using its vendor's own mechanism, each covered by a fixture-backed test asserting the prompt reaches the right field in the request body"
  - "The site renders a per-condition view and a cross-condition comparison showing, per model, whether its verdict changed between the control and each other condition"
  - "A run file written under schema version 1 still renders, proving the versioning was worth carrying"
  - "docs/providers.md and the methodology page state the multiplied cost and define every condition in the registry"
  - "A fork can run the control condition alone, so adopting this feature does not force the extra spend on anyone"
description: "Ask every question under several named **conditions** rather than only one, so the benchmark measures how a model's answer moves when the framing moves.\n\nThe motivating case: run \"Is a hot dog a sandwich? One word answer.\" with no system prompt (the control), and again with the system prompt \"A hot dog is a sandwich.\" A model that answers \"No\" in the control and \"Yes\" under assertion has told us something far more interesting than either answer alone — and something that generalises to every real evaluation anyone would build from this repository. Suggestibility under instruction is a genuine, measurable property, unlike whether a hot dog is a sandwich.\n\nA condition is a named variant of how a question is asked: a system prompt, an optional prompt prefix or suffix, and optionally a temperature. Conditions live in a registry file (`conditions.json`) alongside questions and models, so adding one stays a data change. The run matrix becomes condition x question x model x samples.\n\n**Two consequences that shape the whole epic, and are the reason this is not a small change:**\n\n**1. It is a breaking schema change.** Every result gains a `conditionId`, so `SCHEMA_VERSION` goes to 2 and existing committed runs need a migration path — the site must still render editions written under version 1, which is exactly what the version field was put there for on day one.\n\n**2. It multiplies cost linearly.** Three conditions triples the weekly spend: 3 questions x 3 conditions x 7 models x 3 samples is 189 calls a week against the current 63. Still cents, but the report and `docs/providers.md` must say so, and the control condition must be distinguishable so a fork can run only that.\n\nThe presentation problem is the interesting one. The current report answers \"what did the field say\"; with conditions it must answer \"what did the field say, and how much did that depend on how we asked\" — which means a cross-condition comparison view, not just three separate reports.\n\nAdapter work is real but bounded: every vendor supports a system prompt and every one does it differently. Anthropic takes a top-level `system`, OpenAI's Responses API takes `instructions`, Gemini takes `systemInstruction`, and the OpenAI-compatible dialect takes a leading message with `role: \"system\"`. `CompleteRequest` gains an optional `systemPrompt` and each of the seven adapters maps it."
lastModified: "2026-09-01T23:49:27.925Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Condition registry and schema version 2](./condition-registry-and-schema-aca81e.md) | pending |
| [Cross-condition comparison in the report](./cross-condition-comparison-in-fc24ca.md) | pending |
| [Runner and CLI support for the condition matrix](./runner-and-cli-support-for-the-f5ff80.md) | pending |
| [System prompt support across all seven adapters](./system-prompt-support-across-afc8d0.md) | pending |
