---
id: "b17721fe-2713-447d-b7c6-3af7be8e481a"
level: "task"
title: "Extend ci.yml with data schema validation and site build jobs"
status: "pending"
priority: "high"
tags:
  - "ci"
blockedBy:
  - "373822e3-55d6-4282-ae9a-ba56ea9db457"
  - "ca13dcb1-ca92-4c56-8116-a2a26ab7294b"
  - "dae0505e-dafa-4f48-b7ab-183f42a5d318"
source: "ndx-capture"
acceptanceCriteria:
  - "A PR that adds an invalid data/runs file fails the data-validate job naming the file"
  - "The build job produces a dist/ artifact on every PR"
  - "ci.yml still references no secrets"
description: "Add jobs to ci.yml that run npm run data:validate against every committed run file and npm run build for the Astro site, uploading dist/ as an artifact for later a11y checks. Fail the PR with a readable message naming the offending data file or build error. Keep the workflow secret-free."
lastModified: "2026-09-01T18:43:57.805Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
