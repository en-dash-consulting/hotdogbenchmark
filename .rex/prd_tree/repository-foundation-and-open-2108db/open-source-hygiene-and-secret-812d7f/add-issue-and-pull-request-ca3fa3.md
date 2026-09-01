---
id: "ca3fa355-e371-4adf-b5e5-1a620ff8b59f"
level: "task"
title: "Add issue and pull request templates including an add-a-model template"
status: "completed"
priority: "medium"
tags:
  - "oss"
source: "ndx-capture"
startedAt: "2026-09-01T21:13:47.933Z"
completedAt: "2026-09-01T21:14:50.469Z"
endedAt: "2026-09-01T21:14:50.469Z"
resolutionType: "code-change"
resolutionDetail: ".github/ISSUE_TEMPLATE/{bug_report,add_model_or_provider,weird_answer}.yml plus config.yml, and PULL_REQUEST_TEMPLATE.md with a no-secrets checklist item. tests/issue-templates.test.ts validates each form against GitHub's issue-forms schema (element types, unique ids, required labels) and asserts the add-a-model fields and the PR no-secrets item.</resolutionDetail>\n</invoke>\n"
acceptanceCriteria:
  - "Three issue form templates exist and render correctly in GitHub's new-issue chooser"
  - "Add-a-model template captures provider, model ID, docs URL, pricing URL, streaming support, and usage-reporting support"
  - "PR template includes a checklist item confirming no secrets or .env files are included"
description: "Create .github/ISSUE_TEMPLATE with YAML forms: bug report, add a model or provider (asks for provider, model ID, docs link, pricing link, whether it supports streaming and usage reporting), and \"a model gave a weird answer\" (fun, low-friction). Add PULL_REQUEST_TEMPLATE.md with a checklist: tests added, fixtures recorded, docs updated, no secrets."
lastModified: "2026-09-01T21:14:50.485Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
