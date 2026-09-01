---
id: "0910c270-6b38-4916-907d-ac512efe035b"
level: "task"
title: "Write docs/providers.md: key setup, free tiers, rate limits, and weekly cost expectations"
status: "pending"
priority: "medium"
tags:
  - "docs"
  - "providers"
blockedBy:
  - "7e7bc1b4-2fd3-4d90-a01f-240bf1eecafd"
  - "1cdf1558-34d4-442a-8fa8-5f96e7e87efb"
  - "7f2ec4c0-312c-46fc-9f17-6e7080a1c3d1"
  - "df48d791-f7b7-45c2-8451-a41fd3b5b652"
  - "6b39227d-4270-492d-ad82-6f2e55be0f88"
  - "6e98e353-4bbc-4ecf-900a-5b23fd27b21a"
source: "ndx-capture"
acceptanceCriteria:
  - "docs/providers.md has a section per enabled provider with key path, free tier or minimum spend, rate limits, env var, and estimated weekly cost"
  - "A total estimated monthly cost is stated and derived from models.json pricing via a documented calculation"
  - "README, SECURITY.md, and docs/self-hosting.md link to it"
description: "For each provider in models.json document: where to create an API key (exact console path), whether a free tier or credit exists and any minimum spend, rate limits relevant to a three-sample run, which env var to set, and an estimated weekly cost for this prompt computed from the pricing table (it should be cents). Include a total estimated monthly cost for running the whole benchmark and a note on setting spend limits in each console. Link from README, SECURITY.md, and the self-hosting guide."
lastModified: "2026-09-01T18:48:35.244Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
