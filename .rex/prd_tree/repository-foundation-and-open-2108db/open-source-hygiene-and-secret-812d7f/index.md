---
id: "812d7f33-3e70-43d1-8bd7-1ce71289200b"
level: "feature"
title: "Open-source hygiene and secret-handling policy"
status: "pending"
priority: "high"
tags:
  - "oss"
  - "security"
source: "ndx-capture"
acceptanceCriteria:
  - "LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, and SECURITY.md exist and are linked from README"
  - ".github/ISSUE_TEMPLATE contains bug, add-model-or-provider, and weird-answer templates plus a PR template with a checklist"
  - ".gitignore excludes .env and .env.* except .env.example, and .env.example lists every provider key variable with a comment on where to obtain it"
  - "README skeleton states the question, the weekly cadence, the educational purpose, and a placeholder for the live URL"
description: "The files and conventions that make the repo safe to publish and pleasant to contribute to: MIT LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md (how to report issues and how API keys are handled), issue and PR templates including a dedicated \"Add a model or provider\" template, a README skeleton, and a hard rule that secrets live only in .env locally and GitHub Actions secrets in CI."
lastModified: "2026-09-01T18:39:33.213Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Add issue and pull request templates including an add-a-model template](./add-issue-and-pull-request-ca3fa3.md) | in_progress |
| [Add LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY files](./add-license-contributing-code-cd4ccb.md) | completed |
| [Write .env.example, .gitignore secret rules, and README skeleton](./write-env-example-gitignore-295e20.md) | pending |
