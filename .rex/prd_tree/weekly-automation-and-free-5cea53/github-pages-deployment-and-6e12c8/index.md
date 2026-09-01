---
id: "6e12c8c3-5523-4137-9b78-3c935431fca8"
level: "feature"
title: "GitHub Pages deployment and self-hosting guide"
status: "pending"
priority: "high"
tags:
  - "hosting"
  - "ci"
  - "docs"
blockedBy:
  - "f731352d-6d83-410a-b824-39801e15f124"
  - "9d9cc82c-b23a-4464-b841-156c9e6d396a"
source: "ndx-capture"
acceptanceCriteria:
  - "deploy.yml publishes dist/ to GitHub Pages on push to main and after a successful benchmark workflow run, with permissions pages: write and id-token: write only"
  - "The live site loads with correct asset paths under the project base path and, when CNAME is configured, at the custom domain"
  - "docs/self-hosting.md walks through fork, enable Pages, add secrets, edit schedule, edit models.json, and trigger a manual run, with screenshots or exact UI paths"
  - "README links to the live site and the self-hosting guide"
description: "Deploy the Astro build to GitHub Pages using the official actions (configure-pages, upload-pages-artifact, deploy-pages) on push to main and via workflow_run after the weekly benchmark commits new data, so the site is never stale. Handle base path for project pages and an optional custom domain via CNAME. Write docs/self-hosting.md so a forker can enable Pages, add secrets, adjust the cron, and change the model list without reading source."
lastModified: "2026-09-01T18:44:58.949Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Create deploy.yml to publish the site to GitHub Pages on push and after each benchmark run](./create-deploy-yml-to-publish-f86235.md) | pending |
| [Write docs/self-hosting.md for forkers](./write-docs-self-hosting-md-for-529abe.md) | pending |
