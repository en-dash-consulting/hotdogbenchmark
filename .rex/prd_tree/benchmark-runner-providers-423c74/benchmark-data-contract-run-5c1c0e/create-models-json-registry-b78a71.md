---
id: "b78a714a-10e9-49b2-8bcf-c45d2e986e36"
level: "task"
title: "Create models.json registry with zod validation"
status: "pending"
priority: "critical"
tags:
  - "schema"
  - "providers"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
acceptanceCriteria:
  - "models.json validates against src/schema/models.ts and a unit test fails on duplicate provider+modelId pairs"
  - "Registry contains at least seven enabled entries covering the seven planned providers with docsUrl and pricingUrl populated"
  - "Every modelId is verifiable against a linked provider documentation page recorded in the entry"
  - "loadModels() returns only enabled entries and preserves file order"
description: "Add models.json at the repo root listing every benchmarked model: provider id, modelId (resolved from each provider's current documentation at implementation time, never guessed), displayName, vendor name, docsUrl, pricing (inputUsdPerMTok, outputUsdPerMTok, nullable, with a pricingUrl and asOf date), supportsStreaming, supportsUsage, enabled flag, and notes. Validate with a zod schema in src/schema/models.ts and expose loadModels() that filters to enabled entries. Seed with one flagship model per provider: Anthropic, OpenAI, Google Gemini, xAI, Mistral, DeepSeek, and Meta Llama via a hosted provider (Groq or Together). Document in CONTRIBUTING how to add an entry."
lastModified: "2026-09-01T18:41:34.962Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
