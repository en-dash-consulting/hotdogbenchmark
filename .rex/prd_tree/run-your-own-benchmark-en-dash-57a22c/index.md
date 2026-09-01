---
id: "57a22c2d-0101-4101-b444-9b4d327cfc69"
level: "epic"
title: "Run your own benchmark: En Dash SSO, bring-your-own keys, custom query (deferred)"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "auth"
  - "byok"
blockedBy:
  - "787e817b-ec54-4d38-94f9-634dfe34505d"
source: "ndx-capture"
acceptanceCriteria:
  - "A visitor signed in with an En Dash account can enter their own question and provider keys, run all enabled models, and see a full report rendered client-side"
  - "Provider keys are held in browser memory or session storage only, sent to the proxy per request over TLS, and never logged or persisted server-side, verified by code review and proxy tests"
  - "The static site build, weekly workflow, and data/ contents are unaffected when the feature flag is off"
  - "Unauthenticated requests to the proxy are rejected and per-user rate limits prevent abuse"
description: "Deferred, post-launch capability. Let a signed-in visitor run the same benchmark on their own question, across all configured models, using their own provider API keys, and view the results with the same report components. The published site stays static and never holds provider keys or live LLM traffic; this feature adds a small serverless proxy (free tier, e.g. Cloudflare Workers or Vercel Functions) that authenticates the user via En Dash single sign-on (OIDC), forwards provider calls using keys the user supplies for that session only (never persisted server-side), and streams results back to a client-side runner built from the same runtime-agnostic core and adapters the CLI uses. Results render in the browser and are never written to data/. Until the proxy exists, the feature is stubbed behind a build-time feature flag with a disabled \"Run your own\" page explaining what is coming. The foundational constraint (adapters and runner core are runtime-agnostic with injected credentials and fetch) is already enforced in the runner epic so this can be added without refactoring."
lastModified: "2026-09-01T18:53:05.126Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Bring-your-own-keys custom question runner UI](./bring-your-own-keys-custom-a87124/index.md) | pending |
| [Browser-ready runner core and feature-flagged Run Your Own stub page](./browser-ready-runner-core-and-80acfc/index.md) | pending |
| [Serverless proxy with En Dash single sign-on and per-user rate limits](./serverless-proxy-with-en-dash-e51955/index.md) | pending |
