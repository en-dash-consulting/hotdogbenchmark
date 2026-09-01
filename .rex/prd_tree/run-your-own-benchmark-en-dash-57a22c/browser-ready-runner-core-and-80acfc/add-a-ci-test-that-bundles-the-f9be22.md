---
id: "f9be2268-1c7e-441f-8c75-7f253e83a58f"
level: "task"
title: "Add a CI test that bundles the runner core and adapters for the browser and executes a mock run headlessly"
status: "completed"
priority: "low"
tags:
  - "deferred"
  - "runner"
  - "ci"
blockedBy:
  - "12dc8157-cf91-4f6f-93dd-7fb7c9b17f75"
  - "6d8676b6-9031-42f8-be35-82aee8fc19b9"
source: "ndx-capture"
startedAt: "2026-09-01T23:04:30.159Z"
completedAt: "2026-09-01T23:04:30.159Z"
endedAt: "2026-09-01T23:04:30.159Z"
resolutionType: "code-change"
resolutionDetail: "tests/browser/bundle.test.ts uses esbuild to bundle src/runner/run.ts plus all seven adapters, the mock adapter and the analysis modules for platform:'browser' with no polyfills configured, asserts the output contains no node: builtin reference, no process.env and no fs calls, then injects it into headless Chromium on about:blank and runs runBenchmark with an injected adapter — returning a run that validates against the shared schema. Added as a dedicated `browser` job in ci.yml running on every pull request.</resolutionDetail>\n"
acceptanceCriteria:
  - "Bundling for the browser target succeeds with zero Node polyfills and the test fails if node: or process.env appears in the output"
  - "The bundle runs a mock benchmark in headless Chromium and returns a run that validates against the shared schema"
  - "The test runs in ci.yml on every PR"
description: "Add tests/browser/bundle.test.ts that uses esbuild (or Vite's library mode) to bundle src/runner/run.ts plus every registered adapter for platform: browser with no Node polyfills, asserts the bundle contains no references to node: builtins or process.env, then loads it in headless Chromium via Playwright and runs runBenchmark with the mock adapter and an injected fetch, asserting a schema-valid BenchmarkRun comes back. This is the enforcement mechanism for the runtime-agnostic constraint and should run in the PR CI workflow."
lastModified: "2026-09-01T23:04:30.173Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
