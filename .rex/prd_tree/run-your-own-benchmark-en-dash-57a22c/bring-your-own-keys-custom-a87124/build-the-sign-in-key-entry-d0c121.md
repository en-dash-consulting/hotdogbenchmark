---
id: "d0c121d9-cc4c-4ad2-b54f-9d92dba0a346"
level: "task"
title: "Build the sign-in, key entry, question, and model selection form on /run/"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "site"
  - "byok"
source: "ndx-capture"
acceptanceCriteria:
  - "Keys are stored only in sessionStorage, cleared on sign-out, and never included in any request except to the proxy origin, verified by a Playwright network audit"
  - "Models whose provider has no key are disabled with an explanation and the prompt preview matches what will be sent"
  - "Form is fully keyboard operable, errors are announced via a live region, and the page passes axe"
description: "Replace the stub on /run/ (when the flag is on) with the working flow: a sign-in button that redirects through the proxy's OIDC login and shows the signed-in identity from /auth/me; a key entry form with one masked field per provider, stored only in sessionStorage under a namespaced key and cleared on sign-out or tab close, with a visible statement of where keys go; a research question textarea with an optional \"append one-word-answer template\" toggle and a live preview of the exact prompt; model selection checkboxes populated from models.json with providers lacking a key disabled and explained; and sample count and concurrency controls with sane limits. All controls are labeled, keyboard operable, and validated with inline, announced errors."
lastModified: "2026-09-01T18:56:28.894Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
