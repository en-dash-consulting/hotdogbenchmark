---
id: "f5ff807a-8c63-4eb5-a377-90d70513c3ae"
level: "feature"
title: "Runner and CLI support for the condition matrix"
status: "pending"
priority: "high"
tags:
  - "runner"
blockedBy:
  - "aca81e46-57cf-419b-8b1c-0fda1414a8bd"
  - "afc8d03e-cd7c-4e09-9175-3e8856815452"
source: "ndx-capture"
acceptanceCriteria:
  - "runBenchmark executes condition x question x model x samples and tags each result with its conditionId, tested with fake adapters over a 2x2x2 matrix"
  - "The one-in-flight-per-provider constraint still holds with conditions enabled, proven by the existing concurrency test extended to a multi-condition matrix"
  - "A condition's systemPrompt, promptPrefix, promptSuffix and temperature all reach the adapter, verified through the recorded request"
  - "bench run --conditions restricts the run, and --dry-run prints the matrix and the total call count"
  - "A failure in one condition does not affect the others: the same partial-failure tolerance applies per cell"
description: "`runBenchmark` takes a `conditions` array and iterates condition x question x model, applying each condition's system prompt, prefix, suffix and temperature to the request.\n\nThe scheduling constraint stays exactly as it is: still never more than one in-flight call per provider, still samples sequential within a job. Conditions add a dimension to the job list, not a reason to loosen the rule — and with three times the jobs, loosening it would be three times as tempting and three times as wrong.\n\n`bench run` gains `--conditions <ids>` alongside the existing `--questions` and `--models`, and `--dry-run` prints the full matrix and total call count, which is the number that matters once conditions multiply it. The weekly workflow keeps running every enabled condition; a fork that wants the cheap path sets `enabled: false` on everything but control."
lastModified: "2026-09-01T23:50:33.405Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
