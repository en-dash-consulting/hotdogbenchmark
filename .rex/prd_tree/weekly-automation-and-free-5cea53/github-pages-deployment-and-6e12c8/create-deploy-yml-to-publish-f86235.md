---
id: "f86235ce-5ae1-40af-9b4a-6c748afa167f"
level: "task"
title: "Create deploy.yml to publish the site to GitHub Pages on push and after each benchmark run"
status: "completed"
priority: "high"
tags:
  - "hosting"
  - "ci"
blockedBy:
  - "276e25f4-d1dd-4115-b85e-bb0e2723445c"
  - "dae0505e-dafa-4f48-b7ab-183f42a5d318"
source: "ndx-capture"
startedAt: "2026-09-01T22:21:15.379Z"
completedAt: "2026-09-01T22:21:15.379Z"
endedAt: "2026-09-01T22:21:15.379Z"
resolutionType: "code-change"
resolutionDetail: ".github/workflows/deploy.yml publishes dist/ to GitHub Pages on push to main (path-filtered to src, data, public, registries, config), on workflow_run after the Weekly benchmark completes successfully, and on workflow_dispatch. permissions limited to contents:read + pages:write + id-token:write, concurrency group 'pages' with cancel-in-progress:true, timeout-minutes on both jobs. Uses configure-pages/upload-pages-artifact/deploy-pages. Custom domain supported via the SITE_URL repository variable, which astro.config.mjs uses to switch the base path from /<repo>/ to /. The build job is gated so a failed benchmark never publishes.</resolutionDetail>\n"
acceptanceCriteria:
  - "Pushing to main deploys the site and the live URL serves the latest build with correct asset paths"
  - "A successful benchmark workflow run triggers a redeploy that shows the new week's data without manual action"
  - "Workflow permissions are limited to pages: write, id-token: write, contents: read and a pages concurrency group is set"
  - "Custom domain works when SITE_URL and a CNAME file are configured"
description: "Add .github/workflows/deploy.yml triggered on push to main (paths: src, data, package files, astro config) and on workflow_run of the benchmark workflow completing successfully. Steps: checkout, setup-node, npm ci, npm run build with the correct base path (derived from repository name unless a SITE_URL variable is set for a custom domain), configure-pages, upload-pages-artifact, deploy-pages. Permissions pages: write, id-token: write, contents: read. Concurrency group pages with cancel-in-progress true. Document enabling Pages with the GitHub Actions source in the repo settings."
lastModified: "2026-09-01T22:21:15.391Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
