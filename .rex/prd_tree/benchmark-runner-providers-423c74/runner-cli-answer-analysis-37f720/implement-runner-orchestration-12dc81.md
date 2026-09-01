---
id: "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
level: "task"
title: "Implement runner orchestration and bench run CLI with bounded concurrency and partial-failure tolerance"
status: "in_progress"
priority: "critical"
tags:
  - "runner"
blockedBy:
  - "32695d3a-6911-4207-a27c-973b9cd576f2"
  - "ca13dcb1-ca92-4c56-8116-a2a26ab7294b"
  - "88a2d050-ee6b-461d-9b48-d21d1cc380ad"
  - "cd84a5a1-91b1-4d96-8ff9-4fba90da9e13"
source: "ndx-capture"
startedAt: "2026-09-01T21:49:46.149Z"
acceptanceCriteria:
  - "With fake adapters, 3 questions × 5 models where 2 models throw produces 9 ok and 6 error results and exits 0; a run where all throw exits 1"
  - "Concurrency is bounded and at most one in-flight call per provider, proven by a test; samples for one job run sequentially"
  - "Running twice for the same isoWeek overwrites the same file and data/index.json still lists it once"
  - "bench run --dry-run prints questions, models, samples, concurrency, and output path and makes no adapter calls"
  - "src/runner/run.ts has no imports from node: builtins, enforced by a lint rule or test"
description: "In src/runner/run.ts implement runBenchmark({ questions, models, credentials, samples, concurrency, timeoutMs, now }) that for each enabled question and model calls the adapter samples times sequentially (so timing is not skewed by self-contention), runs model × question jobs through a bounded concurrency pool (default 3, never more than one in-flight call per provider at a time to avoid rate-limit skew), catches per-job errors into status error entries, builds the BenchmarkRun (schemaVersion, runId, isoWeek, questions, runnerVersion from package.json, gitSha from env or git), validates it with the schema, writes data/runs/<isoWeek>.json (overwriting the same week idempotently), and regenerates data/index.json. The core must be runtime-agnostic: no fs, process, or Node-only imports inside runBenchmark; persistence and credential loading live in the CLI layer. In src/cli.ts wire bench run with flags --questions, --models, --samples, --concurrency, --timeout, --out, --dry-run, --mock and clear exit codes: 0 success, 1 all jobs failed, 2 invalid usage. Print a compact per-question, per-model summary table to stdout."
lastModified: "2026-09-01T21:49:46.164Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
