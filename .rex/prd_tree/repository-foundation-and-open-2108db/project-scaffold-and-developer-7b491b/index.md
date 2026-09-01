---
id: "7b491be0-3e4c-4d74-a6e4-8ee87a7811f7"
level: "feature"
title: "Project scaffold and developer tooling"
status: "pending"
priority: "critical"
tags:
  - "foundation"
  - "tooling"
source: "ndx-capture"
acceptanceCriteria:
  - "npm install && npm run lint && npm run typecheck && npm test all succeed on a fresh clone"
  - "package.json defines dev, build, bench, test, lint, format, and typecheck scripts"
  - "Node version is pinned via .nvmrc and engines and documented in README"
  - "Directory layout src/runner, src/providers, src/schema, src/site, data/runs exists with README stubs explaining each"
description: "Single-package TypeScript project with npm scripts that every later epic relies on: install, dev, build, bench, test, lint, format, typecheck. Pins Node LTS, uses strict TypeScript, ESLint + Prettier, Vitest. Establishes the src/ layout (src/runner, src/providers, src/schema, src/site) and the data/ directory so later features have agreed homes."
lastModified: "2026-09-01T18:39:26.669Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Establish src and data directory layout with environment loading](./establish-src-and-data-605914.md) | in_progress |
| [Initialize TypeScript package with lint, format, test, and typecheck scripts](./initialize-typescript-package-18b13b.md) | completed |
