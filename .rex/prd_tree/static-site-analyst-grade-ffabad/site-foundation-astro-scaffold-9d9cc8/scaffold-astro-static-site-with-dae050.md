---
id: "dae0505e-dafa-4f48-b7ab-183f42a5d318"
level: "task"
title: "Scaffold Astro static site with build-time data loader and GitHub Pages base path"
status: "completed"
priority: "high"
tags:
  - "site"
blockedBy:
  - "605914d2-79c7-4568-a847-3ae7cc099ce2"
  - "70964147-34bd-4a6e-89e4-f40dfc9ab5f5"
source: "ndx-capture"
startedAt: "2026-09-01T22:00:21.152Z"
completedAt: "2026-09-01T22:07:52.897Z"
endedAt: "2026-09-01T22:07:52.897Z"
resolutionType: "code-change"
resolutionDetail: "astro.config.mjs with output:static, no UI framework, srcDir src/site, base derived from GITHUB_REPOSITORY and overridable via SITE_URL for a custom domain. src/site/lib/data.ts validates every run file and both registries through the shared zod schemas at import time and exposes getLatestRun/getAllRuns/getRun/getPreviousRun/getNextRun/getQuestions/getQuestionResult/getModelHistory/getModelsSeenForQuestion. src/site/lib/urls.ts routes every internal link through the configured base. npm run build emits dist/ with zero client JS beyond the theme toggle. Fixed a real bug found by the first build: REPO_ROOT was derived from import.meta.url and resolved to dist/ once bundled, so it now walks up from cwd to the nearest package.json.</resolutionDetail>\n"
acceptanceCriteria:
  - "npm run build emits dist/ with links that resolve under the GitHub Pages base path and npm run dev serves the site locally"
  - "Data loader validates every run file and both registries against the shared schemas and fails the build with the offending file path on invalid data"
  - "All data helpers are typed and unit tested against fixture runs with three questions"
  - "Built HTML for the placeholder page ships zero client-side JavaScript"
description: "Add Astro to the package (output: static, no UI framework integration), configure site and base for GitHub Pages (base derived from repository name, overridable via env for custom domains), and create src/site/lib/data.ts that reads data/index.json, data/runs/*.json, questions.json, and models.json at build time, validates them with the shared zod schemas, and exposes typed helpers: getLatestRun(), getAllRuns(), getRun(isoWeek), getQuestions(), getQuestionResult(run, questionId), getModelHistory(questionId, provider, modelId), getPreviousRun(isoWeek). Wire npm run dev and npm run build. Add a placeholder index page that lists the questions and the latest run's isoWeek to prove the pipeline."
lastModified: "2026-09-01T22:07:52.910Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
