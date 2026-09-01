---
id: "eff8ec66-ce5b-47d1-9636-97e4748373d8"
level: "task"
title: "Scaffold the serverless proxy with En Dash OIDC sign-in and session management"
status: "pending"
priority: "low"
tags:
  - "deferred"
  - "auth"
  - "backend"
source: "ndx-capture"
acceptanceCriteria:
  - "Login completes an OIDC PKCE flow against a mocked IdP in tests and sets an HttpOnly, Secure, SameSite session cookie with a short lifetime"
  - "/auth/me returns the signed-in user's id and display name and 401 when signed out; logout invalidates the session"
  - "CORS allows only the configured site origin and CSRF tokens are required on state-changing requests"
  - "docs/proxy.md documents the platform decision, required En Dash IdP settings, environment variables, and deployment steps"
description: "Create proxy/ as a separate workspace with its own package.json targeting Cloudflare Workers (fall back to Vercel Functions if Workers cannot meet the streaming or free-tier needs; record the decision in docs/proxy.md). Implement OIDC authorization code flow with PKCE against the En Dash identity provider (issuer, client id, redirect URIs, and allowed origins supplied via environment variables and documented), issue a short-lived HttpOnly SameSite=Lax session cookie backed by a signed token, add /auth/login, /auth/callback, /auth/logout, and /auth/me endpoints, CSRF protection for state-changing requests, and strict CORS limited to the site origin. Add a deploy workflow and tests using a mocked IdP."
lastModified: "2026-09-01T18:56:13.584Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---
