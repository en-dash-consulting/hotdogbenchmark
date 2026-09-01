---
id: "c7a8e168-2152-48ca-b2f3-549e2d38a642"
level: "task"
title: "Write the Add a model page"
status: "pending"
priority: "low"
tags:
  - "site"
  - "docs"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
source: "ndx-capture"
acceptanceCriteria:
  - "Page lists exact file paths and commands for adding a model and for adding a provider"
  - "Page links to the add-a-model issue template and CONTRIBUTING"
  - "Page passes axe"
description: "Create src/site/pages/add-a-model.astro: the exact steps to add a model to an existing provider (edit models.json, verify the ID against docs, add pricing, run bench:smoke, open a PR) and to add a new provider (copy the Anthropic adapter, implement complete(), record fixtures, fill the normalization row, register it, add the key to .env.example and SECURITY notes), with links to the GitHub issue template and CONTRIBUTING. Keep it in sync with CONTRIBUTING by sharing a markdown source if practical."
lastModified: "2026-09-01T18:46:56.040Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
