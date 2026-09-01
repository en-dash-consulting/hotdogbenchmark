---
id: "cd84a5a1-91b1-4d96-8ff9-4fba90da9e13"
level: "task"
title: "Implement per-model aggregation and pricing-based cost estimates"
status: "pending"
priority: "high"
tags:
  - "runner"
blockedBy:
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
  - "b78a714a-10e9-49b2-8bcf-c45d2e986e36"
source: "ndx-capture"
acceptanceCriteria:
  - "aggregateSamples returns correct medians for odd and even sample counts and ignores null ttfbMs values, proven by tests"
  - "Majority verdict resolves ties to other and followedInstructionRate is a 0..1 float"
  - "estimateCost returns null when pricing is missing and a correctly rounded USD value otherwise, with a test using known token counts and rates"
  - "Aggregation of an empty sample array returns a well-defined empty aggregate rather than throwing"
description: "In src/runner/aggregate.ts implement aggregateSamples(samples) producing median, min, and max for totalMs, ttfbMs (ignoring nulls), inputTokens, outputTokens, and totalTokens, plus tokensPerSecond (outputTokens / (totalMs/1000), median), majority verdict with tie → other, and followedInstructionRate. In src/runner/cost.ts implement estimateCost(usage, pricing) returning USD to 6 decimals or null when pricing is absent, using input and output rates only (cached and reasoning handled per docs/usage-normalization.md notes). Both are pure functions with exhaustive unit tests."
lastModified: "2026-09-01T18:43:25.296Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
