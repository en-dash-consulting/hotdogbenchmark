---
id: "37f720dc-0d58-4047-91a0-fa67ea5878ed"
level: "feature"
title: "Runner CLI, answer analysis, aggregation, cost estimates, and mock mode"
status: "pending"
priority: "critical"
tags:
  - "runner"
blockedBy:
  - "1385de8d-ce5b-458c-908f-3539ee02242b"
  - "5c1c0eae-9ae0-4761-9be7-5fa60222625b"
source: "ndx-capture"
acceptanceCriteria:
  - "bench run --mock writes a schema-valid run file and updated data/index.json with no network access and no API keys"
  - "bench run with one adapter throwing records status error for that model and status ok for the rest, exiting 0 when at least one model succeeded"
  - "Each sample records verdict, followedInstruction, usage, timing, and costEstimateUsd (null when pricing is missing), and each model result records median totalMs, median tokens, and majority verdict"
  - "bench run --dry-run lists the models, sample count, concurrency, and output path without calling any provider"
description: "The orchestration layer: bench run iterates enabled models with bounded concurrency, takes N samples per model (default 3), normalizes each answer (verdict yes/no/other, followedInstruction), aggregates medians and majority verdicts, computes optional cost estimates from models.json pricing, tolerates per-model failures, and writes a schema-valid run file plus refreshed index. Includes a --mock mode backed by recorded fixtures so anyone can run the full pipeline without keys, and a --dry-run that prints the plan. Unit tests cover partial failure, timeouts, concurrency limits, and idempotent re-runs for the same week."
lastModified: "2026-09-01T18:42:04.373Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Implement answer normalization: verdict classification and one-word compliance](./implement-answer-normalization-88a2d0.md) | in_progress |
| [Implement --mock mode with recorded fixtures for keyless end-to-end runs](./implement-mock-mode-with-6d8676.md) | pending |
| [Implement per-model aggregation and pricing-based cost estimates](./implement-per-model-aggregation-cd84a5.md) | pending |
| [Implement runner orchestration and bench run CLI with bounded concurrency and partial-failure tolerance](./implement-runner-orchestration-12dc81.md) | pending |
