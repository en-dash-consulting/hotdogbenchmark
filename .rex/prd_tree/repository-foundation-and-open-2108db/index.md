---
id: "2108dbe8-4cc0-4d85-8278-8431554ee55f"
level: "epic"
title: "Repository foundation and open-source scaffolding"
status: "pending"
priority: "critical"
tags:
  - "foundation"
  - "oss"
source: "ndx-capture"
acceptanceCriteria:
  - "A fresh clone can run install, lint, typecheck, and test scripts successfully with zero source files beyond scaffolding"
  - "Repository contains LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, and a README that states the project purpose and its contrived-but-educational intent"
  - "No secret or .env file can be committed: .gitignore covers them and .env.example documents every required variable"
description: "Turn the empty repo into a working, contributor-friendly TypeScript project before any benchmark or site code lands. Establishes tooling (package manager, TypeScript, lint/format, Vitest), secret-handling conventions (.env.example, never-commit policy), and the open-source hygiene files (MIT LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates). Everything downstream builds on this, so it goes first. Stack decision: single npm package (no monorepo), Node LTS, TypeScript strict, Vitest for tests, Astro for the static site (chosen later in the site epic but tooling must not preclude it)."
lastModified: "2026-09-01T18:38:37.834Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Open-source hygiene and secret-handling policy](./open-source-hygiene-and-secret-812d7f/index.md) | pending |
| [Project scaffold and developer tooling](./project-scaffold-and-developer-7b491b/index.md) | completed |
