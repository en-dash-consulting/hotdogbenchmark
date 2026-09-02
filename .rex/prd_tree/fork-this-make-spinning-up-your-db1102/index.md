---
id: "db1102b9-e087-4b0b-96d7-e29f8d3dd686"
level: "epic"
title: "Fork this: make spinning up your own cross-model analysis a five-minute path"
status: "pending"
priority: "high"
tags:
  - "docs"
  - "site"
  - "oss"
  - "forkability"
source: "ndx-capture 2026-09-01 (maintainer: \"meant for others to fork or clone it, contribute to it, so people can easily spin up an analysis across all the different models\")"
startedAt: "2026-09-02T04:39:58.893Z"
endedAt: "2026-09-02T04:39:58.893Z"
acceptanceCriteria:
  - "The front page has a fork-me section with the repository link, the three commands, and a link to the walkthrough"
  - "docs/fork-this.md takes a reader from clone to a deployed site with a different question, and the docs test checks its links"
  - "Changing the question set requires no code edits, and the site renders correctly with a non-sandwich question set, verified by a build test over a scratch registry"
  - "CONTRIBUTING.md has sections for adding a provider, a model, and a question, each pointing at the one file to change"
description: "The point of the repository is that anyone can clone it, swap the question, add their models and keys, and get a cross-provider, cross-framing analysis with a published site, for cents. The site should say so on the front page and the path should be as short as the claim.\n\nAn analysis of the current fork path, then the fixes it turns up. Known gaps today: the quickstart assumes the hot dog questions; changing the question means editing questions.json, re-recording fixtures, and knowing which files to touch; the site copy hard-codes sandwich framing in places (the About page, the report register); the framings in conditions.json are sandwich-specific templates; and there is no single \"fork checklist\" that walks from clone to a deployed site with a different question.\n\nDeliverables: a front-page section that says fork me with the three commands; a docs/fork-this.md walkthrough (clone, set keys, change the question and framings, run, deploy); a `bench init` or similar that rewrites questions.json and conditions.json interactively and clears fixtures; site copy that reads from the question registry rather than assuming sandwiches; a CONTRIBUTING section on adding providers, models, and questions; and GitHub templates for \"add a model\" and \"add a question\"."
lastModified: "2026-09-02T20:23:42.147Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Ask-a-question input on the site: stays on the site, GitHub first, the En Dash contact route as a configured option](./ask-a-question-input-on-the-328249.md) | pending |
| [bench init: swap the questions and framings interactively and clear stale fixtures](./bench-init-swap-the-questions-63d31b.md) | completed |
| [CONTRIBUTING sections and issue templates for adding a provider, a model, and a question](./contributing-sections-and-issue-57ade3.md) | completed |
| [docs/fork-this.md: clone to deployed site with your own question, start to finish](./docs-fork-this-md-clone-to-820d0a.md) | completed |
| [Fork-me section on the front page](./fork-me-section-on-the-front-page-8dbc7b.md) | completed |
| [Share affordance and credit copy for contributed questions](./share-affordance-and-credit-d69903.md) | pending |
| [Site copy driven by the registries, so a non-sandwich question set renders correctly](./site-copy-driven-by-the-76c385.md) | completed |
