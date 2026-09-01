---
id: "18b13b3b-d67b-479b-8104-0fdd85df7b3e"
level: "task"
title: "Initialize TypeScript package with lint, format, test, and typecheck scripts"
status: "pending"
priority: "critical"
tags:
  - "foundation"
  - "tooling"
source: "ndx-capture"
acceptanceCriteria:
  - "npm run lint, npm run typecheck, and npm test exit 0 on a fresh clone with a trivial placeholder test"
  - "tsconfig.json enables strict, noUncheckedIndexedAccess, and module NodeNext"
  - ".nvmrc and package.json engines agree on a current Node LTS major"
  - "All scripts listed in package.json are documented in README under Development"
description: "Create package.json (type: module), tsconfig with strict mode and NodeNext resolution, ESLint flat config with typescript-eslint, Prettier, and Vitest. Add npm scripts: dev, build, bench (placeholder that prints usage until the runner exists), test, lint, format, typecheck. Pin Node LTS in .nvmrc and engines. Add .editorconfig. Keep dependency count minimal and explain each dev dependency in a short comment block in README's Development section."
lastModified: "2026-09-01T18:39:47.521Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
