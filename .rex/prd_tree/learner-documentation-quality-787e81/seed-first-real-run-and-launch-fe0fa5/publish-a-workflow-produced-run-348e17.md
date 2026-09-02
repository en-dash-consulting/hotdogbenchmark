---
id: "348e1746-9565-4b38-8dd6-db4b0646c06d"
level: "task"
title: "Publish a workflow-produced run and verify the live site"
status: "blocked"
priority: "medium"
tags:
  - "launch"
blockedBy:
  - "d3873795-d9ff-4915-925d-94585937b7db"
source: "ndx-capture"
acceptanceCriteria:
  - "The repository exists on GitHub with the local history pushed"
  - "benchmark.yml has run at least once via workflow_dispatch and committed its own data file with the github-actions bot identity"
  - "deploy.yml fired automatically on that workflow_run and the live site shows the workflow-produced edition"
  - "The step summary rendered the tally and per-model table on the Actions run page"
  - "OG image, feed.json, feed.xml and the archive page all reflect the published week"
  - "Any provider that failed has a linked issue or a deliberate enabled:false in models.json"
description: "**A real run now exists.** `data/runs/2026-W36.json` is committed: 43 samples across five providers, $0.037, `isMock: false`, `gitSha` recorded, validating against the schema. The site renders it and no longer shows the sample-data notice. It was produced by `npm run bench -- run` on a laptop.\n\nWhat remains is the part that actually proves the automation, and it is not the same thing:\n\n1. **Create the GitHub repository and push.** There is no git remote. Nothing above is published.\n2. **Enable Pages** (Settings → Pages → Source: GitHub Actions).\n3. **Add the provider secrets** — the same names as `.env`.\n4. **Run `benchmark.yml` via workflow_dispatch.** This has never executed. Until it does, the cron, the bot-identity commit, the step summary, the `workflow_run` deploy trigger and the failure-policy issue automation are all untested against GitHub.\n5. Confirm `deploy.yml` fired on its own afterwards and the live site shows the new edition.\n6. Spot-check three model cards against the raw JSON; verify the OG image, both feeds and the archive page for that week.\n\nTwo providers will be absent or errored in that run unless their accounts are fixed first: DeepSeek has no credit, Together has no key. That is honest data and the report renders it correctly, but decide deliberately whether to publish an edition with two gaps or to resolve them first.\n\nThe sample run has already been superseded, so there is nothing left to remove from `data/runs/`."
lastModified: "2026-09-02T01:03:47.420Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
