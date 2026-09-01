---
id: "80acfcdc-e574-46c9-bef0-4549b04eacc9"
level: "feature"
title: "Browser-ready runner core and feature-flagged Run Your Own stub page"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "site"
  - "runner"
blockedBy:
  - "37f720dc-0d58-4047-91a0-fa67ea5878ed"
  - "9d9cc82c-b23a-4464-b841-156c9e6d396a"
source: "ndx-capture"
acceptanceCriteria:
  - "A CI test bundles src/runner/run.ts and every adapter for a browser target with no Node polyfills and the bundle executes a mock run in a headless browser"
  - "/run/ is emitted only when RUN_YOUR_OWN_ENABLED is true and, when emitted, explains the planned flow and key handling and links to the CLI"
  - "The weekly workflow, data/, and all other pages are unaffected by the flag"
description: "Prove the runner core and adapters really are runtime-agnostic by bundling them for the browser in a test, and ship a /run/ page behind a build-time feature flag (RUN_YOUR_OWN_ENABLED, default off) that explains the coming capability, what it will and will not do with keys, and links to the CLI as the available alternative. When the flag is off the page is not emitted at all. This is the only part of the deferred epic that should land before launch, because it is cheap and keeps the code honest."
lastModified: "2026-09-01T18:54:23.196Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Add a CI test that bundles the runner core and adapters for the browser and executes a mock run headlessly](./add-a-ci-test-that-bundles-the-f9be22.md) | pending |
| [Add the feature-flagged /run/ stub page describing the planned Run Your Own capability](./add-the-feature-flagged-run-42e343.md) | pending |
