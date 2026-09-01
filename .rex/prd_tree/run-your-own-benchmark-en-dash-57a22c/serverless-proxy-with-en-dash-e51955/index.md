---
id: "e51955ab-f899-43e1-8f38-9e91de50f32a"
level: "feature"
title: "Serverless proxy with En Dash single sign-on and per-user rate limits"
status: "completed"
priority: "low"
tags:
  - "deferred"
  - "auth"
  - "backend"
blockedBy:
  - "80acfcdc-e574-46c9-bef0-4549b04eacc9"
source: "ndx-capture"
startedAt: "2026-09-01T23:11:15.138Z"
completedAt: "2026-09-01T23:11:15.138Z"
endedAt: "2026-09-01T23:11:15.138Z"
acceptanceCriteria:
  - "A user can sign in with an En Dash account via OIDC with PKCE and receives a short-lived, HttpOnly, SameSite session cookie; sign-out revokes it"
  - "The forward endpoint rejects unauthenticated requests, forwards only to an allowlist of provider hosts, never persists or logs keys or prompts (verified by tests and a logging audit), and streams responses"
  - "Per-user and global rate limits are enforced and return a clear 429 with Retry-After"
  - "docs/proxy.md documents deployment, required En Dash IdP settings, environment variables, and threat model"
description: "A minimal proxy on a free-tier serverless platform (evaluate Cloudflare Workers first, then Vercel Functions) that signs users in with En Dash SSO via OIDC (authorization code flow with PKCE, short-lived session cookie, CSRF protection), exposes a single authenticated endpoint that forwards a provider request using a key supplied in the request for that call only, never logs or stores keys or prompts, enforces per-user and global rate limits, and returns streamed provider responses. Lives in a separate workspace directory (proxy/) with its own deploy workflow and is optional for forks. The En Dash IdP configuration (issuer, client id, allowed origins) is captured in docs before implementation."
lastModified: "2026-09-01T23:11:15.149Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Implement the authenticated provider forward endpoint with allowlist, streaming, and rate limits](./implement-the-authenticated-971013.md) | completed |
| [Scaffold the serverless proxy with En Dash OIDC sign-in and session management](./scaffold-the-serverless-proxy-eff8ec.md) | completed |
