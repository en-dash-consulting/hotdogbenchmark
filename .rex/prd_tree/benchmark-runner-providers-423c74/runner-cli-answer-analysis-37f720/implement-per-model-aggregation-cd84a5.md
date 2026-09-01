---
id: "cd84a5a1-91b1-4d96-8ff9-4fba90da9e13"
level: "task"
title: "Implement per-model aggregation and pricing-based cost estimates"
status: "completed"
priority: "high"
tags:
  - "runner"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
  - "b78a714a-10e9-49b2-8bcf-c45d2e986e36"
source: "ndx-capture"
startedAt: "2026-09-01T21:49:22.229Z"
completedAt: "2026-09-01T21:49:22.229Z"
endedAt: "2026-09-01T21:49:22.229Z"
resolutionType: "code-change"
resolutionDetail: "src/runner/aggregate.ts: statOf() gives median/min/max with correct even-count averaging and null for empty input; aggregateSamples() covers totalMs, ttfbMs (excluding nulls), input/output/total tokens, tokensPerSecond, majority verdict with ties→other, followedInstructionRate as a 0..1 float, and summed cost; an empty sample array returns a well-defined empty aggregate rather than throwing. src/runner/cost.ts: estimateCost() returns USD to 6 decimals or null when pricing is missing, plus sumCosts() and formatCost(). 43 tests including odd/even medians, tie resolution, null-ttfb exclusion, zero-duration guard, and schema round-trip of every aggregate shape.</resolutionDetail>\n"
acceptanceCriteria:
  - "aggregateSamples returns correct medians for odd and even sample counts and ignores null ttfbMs values, proven by tests"
  - "Majority verdict resolves ties to other and followedInstructionRate is a 0..1 float"
  - "estimateCost returns null when pricing is missing and a correctly rounded USD value otherwise, with a test using known token counts and rates"
  - "Aggregation of an empty sample array returns a well-defined empty aggregate rather than throwing"
description: "In src/runner/aggregate.ts implement aggregateSamples(samples) producing median, min, and max for totalMs, ttfbMs (ignoring nulls), inputTokens, outputTokens, and totalTokens, plus tokensPerSecond (outputTokens / (totalMs/1000), median), majority verdict with tie → other, and followedInstructionRate. In src/runner/cost.ts implement estimateCost(usage, pricing) returning USD to 6 decimals or null when pricing is absent, using input and output rates only (cached and reasoning handled per docs/usage-normalization.md notes). Both are pure functions with exhaustive unit tests."
lastModified: "2026-09-01T21:49:22.246Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
