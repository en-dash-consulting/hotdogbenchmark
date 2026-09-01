---
id: "529abef7-8430-4df0-9e05-3af109a9272e"
level: "task"
title: "Write docs/self-hosting.md for forkers"
status: "completed"
priority: "medium"
tags:
  - "docs"
  - "hosting"
blockedBy:
  - "f86235ce-5ae1-40af-9b4a-6c748afa167f"
  - "c64abe7c-a006-47dd-924e-99b56bf59a64"
source: "ndx-capture"
startedAt: "2026-09-01T22:21:19.364Z"
completedAt: "2026-09-01T22:21:19.364Z"
endedAt: "2026-09-01T22:21:19.364Z"
resolutionType: "code-change"
resolutionDetail: "docs/self-hosting.md covers fork, enabling Pages with the GitHub Actions source, adding each of the seven secrets (with the exact console URL per provider), triggering the first run, confirming/changing the cron, editing models.json and questions.json, and the custom-domain path including the SITE_URL variable. Exact GitHub UI paths throughout. Troubleshooting covers all four named failure modes plus two more that bite in practice: workflow_run not firing until the workflows are on the default branch, and GitHub disabling scheduled workflows after 60 days of inactivity. Linked from README, which now states up front that the benchmark never needs to be run locally.</resolutionDetail>\n"
acceptanceCriteria:
  - "Guide covers fork, enable Pages, secrets, custom domain, schedule, model list, manual run, and verification with exact GitHub UI paths"
  - "Troubleshooting section addresses at least the four listed failure modes"
  - "README links to the guide and a fresh fork following it reaches a live site, recorded in the PR"
description: "A step-by-step guide to running your own copy: fork the repo, enable GitHub Pages with the GitHub Actions source, add provider secrets (listing each name), optionally set SITE_URL and CNAME for a custom domain, adjust the cron in benchmark.yml, edit models.json to choose models, trigger a manual benchmark run, and confirm the deploy. Include a troubleshooting section for the common failures (Pages not enabled, missing secret, base path wrong, workflow_run not triggering on forks until first manual run). Link from README."
lastModified: "2026-09-01T22:21:19.377Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
