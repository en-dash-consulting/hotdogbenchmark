---
id: "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
level: "task"
title: "Define versioned zod schema and types for a benchmark run"
status: "completed"
priority: "critical"
tags:
  - "schema"
  - "data"
blockedBy:
  - "18b13b3b-d67b-479b-8104-0fdd85df7b3e"
source: "ndx-capture"
startedAt: "2026-09-01T21:16:39.964Z"
completedAt: "2026-09-01T21:20:05.179Z"
endedAt: "2026-09-01T21:20:05.179Z"
resolutionType: "code-change"
resolutionDetail: "src/schema/run.ts exports zod schemas + inferred types for BenchmarkRun, Question, QuestionResult, ModelResult, Sample, Usage, Timing, Aggregate, Stat and ProviderError, with superRefine rules rejecting unknown questionId references, duplicate ids, negative/non-integer tokens, verdicts outside yes|no|other, missing schemaVersion, finishedAt<startedAt, and inconsistent error status. 24 unit tests; tests/fixtures/runs/example.json (3 questions, 4 models, one failing provider) validates; docs/data-schema.md documents every field with type, unit and nullability rationale.</resolutionDetail>\n</invoke>\n"
acceptanceCriteria:
  - "BenchmarkRun, Question, QuestionResult, ModelResult, Sample, Usage, Timing, and ProviderError zod schemas exist with exported inferred types"
  - "Schema rejects a run missing schemaVersion, a result referencing a questionId not in questions, a sample with negative tokens, or a verdict outside yes|no|other, proven by unit tests"
  - "docs/data-schema.md documents every field with type, unit, nullability, and why it may be null"
  - "A minimal valid example run with three questions lives in tests/fixtures/runs/example.json and passes validation"
description: "In src/schema/run.ts define BenchmarkRun with schemaVersion (start at 1), runId, isoWeek (e.g. 2026-W36), startedAt/finishedAt ISO timestamps, runnerVersion, gitSha, isMock, questions: Question[] (id such as hot-dog, text such as \"Is a hot dog a sandwich? One word answer.\"), and results: QuestionResult[] where QuestionResult = { questionId, models: ModelResult[] }. ModelResult: provider, modelId, displayName, status (ok | partial | error), samples: Sample[], aggregate (median/min/max for totalMs, ttfbMs, inputTokens, outputTokens; majority verdict; followedInstructionRate), error (category, message, retryable) when failed. Sample: text (verbatim), verdict (yes | no | other), followedInstruction (boolean, exactly one word after trimming punctuation), usage (inputTokens, outputTokens, totalTokens, reasoningTokens nullable, cachedInputTokens nullable), timing (startedAt, ttfbMs nullable, totalMs), costEstimateUsd nullable, raw (provider-specific usage object, optional). Export inferred types. Write docs/data-schema.md with a field table including units and nullability rationale."
lastModified: "2026-09-01T21:20:05.194Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
