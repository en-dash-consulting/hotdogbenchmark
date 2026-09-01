---
id: "6e98e353-4bbc-4ecf-900a-5b23fd27b21a"
level: "task"
title: "Implement hosted Meta Llama adapter via Groq or Together"
status: "pending"
priority: "medium"
tags:
  - "providers"
  - "meta"
  - "llama"
blockedBy:
  - "29febc95-266f-4bc8-808a-5ef3d9b79b28"
source: "ndx-capture"
acceptanceCriteria:
  - "Fixture-backed tests cover success, rate limit, and malformed response"
  - "models.json entry and the adapter header state the hosting provider and the methodology page notes that latency reflects the host"
  - "bench:smoke --provider llama-hosted succeeds live and the normalization row is complete"
description: "Write src/providers/llama-hosted.ts to benchmark a current open-weights Meta Llama model through a hosted inference provider (choose Groq or Together based on free tier and usage reporting; record the choice and reason in the adapter header comment and methodology page since host hardware dominates latency). Takes the API key and fetch from AdapterContext (the CLI supplies GROQ_API_KEY or TOGETHER_API_KEY). Reuse the openai-compatible helper if it fits. Fixtures for success, 429, malformed body. Verify the model ID against the host's current docs and fill the normalization row, noting that latency reflects the host, not Meta."
lastModified: "2026-09-01T18:55:38.951Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
