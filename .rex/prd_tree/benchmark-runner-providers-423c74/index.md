---
id: "423c74c8-12a3-4d6b-ab38-d452a92681e1"
level: "epic"
title: "Benchmark runner: providers, metrics, and data contract"
status: "pending"
priority: "critical"
tags:
  - "runner"
  - "providers"
  - "data"
blockedBy:
  - "2108dbe8-4cc0-4d85-8278-8431554ee55f"
source: "ndx-capture"
acceptanceCriteria:
  - "bench run produces a schema-valid data/runs/<iso-week>.json containing one entry per enabled model per question in questions.json with text, usage, timing, verdict, and error fields"
  - "questions.json ships with the hot dog, hamburger, and taco questions and adding a fourth requires no code change"
  - "At least seven major providers (Anthropic, OpenAI, Google Gemini, xAI, Mistral, DeepSeek, and a hosted Meta Llama) have adapters with fixture-based unit tests"
  - "bench run --mock completes end to end with no API keys set"
  - "A single provider failure is recorded as an error entry and does not abort the run or corrupt the output file"
  - "No adapter imports Node-only modules or reads process.env directly; credentials arrive via an injected credentials object"
description: "The core of the project and the main teaching artifact: a small TypeScript CLI that asks every configured model a fixed set of stored questions, each of the form \"Is a <food> a sandwich? One word answer.\" (initial set: hot dog, hamburger, taco, defined in questions.json), captures the verbatim response, token usage (input/output/total, with reasoning and cached tokens surfaced where providers report them), wall-clock latency and time-to-first-token where streaming is available, and writes a versioned JSON run file to data/runs/ containing results for every question × model pair. Built around a tiny ProviderAdapter interface so adding a provider is a one-file change, and kept runtime-agnostic (fetch-based, credentials injected, no Node-only APIs inside adapters) so the same core can later run in a browser for the deferred run-your-own-benchmark epic. Includes answer normalization (yes/no/other, did-it-obey-one-word), repeated samples with median aggregation, optional cost estimates from a pricing table, a fixture-backed mock mode so contributors without API keys can run the whole pipeline, and partial-failure tolerance so one provider outage never loses a week of data. Model IDs are resolved at implementation time from each provider's current docs and kept in a models.json registry, never hardcoded in adapters."
lastModified: "2026-09-01T18:51:08.432Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Benchmark data contract: run schema, model registry, and storage layout](./benchmark-data-contract-run-5c1c0e/index.md) | completed |
| [Provider adapter framework: interface, HTTP helpers, timing, and error normalization](./provider-adapter-framework-1385de/index.md) | pending |
| [Provider adapters for major AI vendors](./provider-adapters-for-major-ai-98858d/index.md) | pending |
| [Runner CLI, answer analysis, aggregation, cost estimates, and mock mode](./runner-cli-answer-analysis-37f720/index.md) | pending |
