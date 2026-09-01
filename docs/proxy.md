# The bring-your-own-keys proxy

A small authenticated proxy that lets a signed-in visitor run the benchmark from their browser
using their own provider API keys.

**It is optional.** The published site does not use it, the weekly benchmark does not use it, and
a fork that does not want the feature never deploys it. `RUN_YOUR_OWN_ENABLED` is off by default.

---

## Why a proxy exists at all

A static site cannot call a provider API directly from the browser. Two reasons, and only the
second is about security:

1. **CORS.** No major provider sends `Access-Control-Allow-Origin` for arbitrary sites, so the
   browser refuses the request before it leaves.
2. **Blast radius.** Even where CORS allows it, a key typed into a page is exposed to every
   script on that page and every origin it talks to.

The proxy narrows that to a single origin under this project's control, which holds no
credentials of its own.

## Platform decision: Cloudflare Workers

Evaluated against Vercel Functions. Workers chosen for three reasons:

- **Streaming works by default.** Returning `upstream.body` straight through is a first-class
  operation. This matters more than it sounds: the whole benchmark is built around
  time-to-first-token, and a proxy that buffers destroys that measurement.
- **The free tier covers this workload** — 100,000 requests a day against an expected few hundred.
- **Web Crypto is the platform API**, so `crypto.subtle` works unchanged in the Worker, in Node
  for the tests, and anywhere else. The proxy has no runtime-specific code.

Vercel Functions would also work. If you prefer it, the handler in `proxy/src/index.ts` is a plain
`(Request) => Promise<Response>` and porting it is an afternoon.

---

## Architecture

```
browser                     proxy (Workers)              provider
   │                             │                          │
   ├── GET  /auth/login ────────►│── 302 ──► En Dash IdP     │
   │                             │                          │
   │◄── 302 /auth/callback ──────┤ (PKCE code exchange)      │
   │    Set-Cookie: session      │                          │
   │                             │                          │
   ├── POST /v1/forward ────────►│                          │
   │    cookie + CSRF            ├── allowlist check ──────►│
   │    key in the body          │                          │
   │◄────────── streamed ────────┤◄──────── streamed ───────┤
```

The key travels: browser session storage → request body → upstream `fetch`. It is never written
to storage, never logged, and never held past the request.

### Endpoints

|                      |                                              |
| -------------------- | -------------------------------------------- |
| `GET /auth/login`    | Redirect to the IdP with PKCE                |
| `GET /auth/callback` | Exchange the code, set the session cookie    |
| `POST /auth/logout`  | Clear the session (CSRF required)            |
| `GET /auth/me`       | Identity and CSRF token, or 401              |
| `POST /v1/forward`   | Forward one provider request (CSRF required) |

---

## Threat model

### 1. Key exposure

**Risk:** a visitor's provider API key is captured.

| Mitigation                                                                                                   | Where        |
| ------------------------------------------------------------------------------------------------------------ | ------------ |
| Keys live in `sessionStorage`, never a cookie, never `localStorage`                                          | Browser      |
| Sent only to the proxy origin, over TLS, per request                                                         | Browser      |
| Never persisted server-side — the proxy has no key storage                                                   | `forward.ts` |
| Never logged: the log function receives a fixed set of fields and no headers or bodies are ever passed to it | `log.ts`     |
| Session cookie is `HttpOnly`, so a script cannot exfiltrate the session either                               | `session.ts` |

**Residual risk:** an XSS on the site origin could read `sessionStorage` while the tab is open.
Mitigated by the site shipping under 1 KB of first-party JavaScript, no third-party scripts, and
no user-generated content rendered as HTML. Not eliminated. A user who considers a key too
valuable to risk should use the CLI, and the page says so.

**Notably absent:** the proxy holds no credentials of its own, so compromising it yields no keys.

### 2. SSRF

**Risk:** an authenticated user points `url` at an internal address and uses the proxy to reach
the platform's private network or a cloud metadata endpoint.

**Mitigation:** a per-provider allowlist of exact hostnames, `https` only. Not a blocklist, not a
suffix match. `api.x.ai.evil.com` fails, because the check is hostname equality rather than
`endsWith`. Tests cover the metadata address, localhost, private ranges, `file://`, plain http,
and the suffix bypass.

This is the single most important check in the proxy.

### 3. Cross-site abuse

**Risk:** another site drives the proxy using a victim's session cookie.

| Mitigation                                                                                    | Where        |
| --------------------------------------------------------------------------------------------- | ------------ |
| `SameSite=Lax` session cookie                                                                 | `session.ts` |
| CORS allows exactly one origin, never `*` — and a wildcard with credentials is invalid anyway | `index.ts`   |
| Double-submit CSRF token on every state-changing request, compared in constant time           | `index.ts`   |
| OIDC `state` carried in a signed cookie and checked on callback                               | `auth.ts`    |

### 4. Abuse and cost

**Risk:** a user, or a compromised account, exhausts the free tier.

**Mitigation:** per-user (60 per 10 minutes) and global (600 per 10 minutes) fixed-window rate
limits, returning 429 with `Retry-After`.

Note the asymmetry that makes this less severe than it looks: **provider costs fall on the user**,
since they supply their own key. The proxy's exposure is its own compute quota, which is why a
fixed window is proportionate.

**Residual risk:** without a KV binding the limiter is per-isolate and therefore approximate under
load. Bind `RATE_LIMIT` for a real deployment.

### 5. Session forgery

**Risk:** an attacker mints a session for another user.

**Mitigation:** sessions are HMAC-SHA-256 signed with a secret of at least 32 characters, verified
with `crypto.subtle.verify` (constant time). Expiry is checked separately from the signature — a
valid signature over an expired session is still rejected. `SESSION_SECRET` is a Worker secret,
not a `vars` entry.

### 6. Upstream response injection

**Risk:** a compromised provider sets a cookie on the proxy origin, which is the origin holding
the session.

**Mitigation:** `Set-Cookie` is stripped from every upstream response, along with hop-by-hop
headers.

---

## Configuration

Non-secret values go in `wrangler.toml` under `[vars]`. Secrets go in `wrangler secret put`.

| Variable              | Secret? | Notes                                                         |
| --------------------- | ------- | ------------------------------------------------------------- |
| `OIDC_ISSUER`         | no      | En Dash issuer, e.g. `https://id.endash.example`              |
| `OIDC_CLIENT_ID`      | no      | Registered client id                                          |
| `OIDC_CLIENT_SECRET`  | **yes** | Only for a confidential client; PKCE alone is fine without it |
| `OIDC_REDIRECT_URI`   | no      | Must exactly match a URI registered with the IdP              |
| `SITE_ORIGIN`         | no      | The one origin allowed to call the proxy                      |
| `SESSION_SECRET`      | **yes** | 32+ random characters. `openssl rand -base64 48`              |
| `SESSION_TTL_SECONDS` | no      | Default 3600, maximum 86400                                   |
| `RATE_LIMIT`          | no      | KV namespace binding. Optional but recommended                |

The proxy refuses to start with a missing or short secret, and returns a 500 naming what is
missing rather than a generic error.

### Required En Dash IdP settings

Register the proxy as an OIDC client with:

- **Redirect URI:** `https://<your-proxy>/auth/callback` — exact match, including scheme.
- **Grant type:** authorization code with PKCE (S256).
- **Scopes:** `openid profile`. Nothing more; the proxy needs a subject and a display name.
- **Client type:** public is sufficient. PKCE is what protects the code exchange.

---

## Deployment

```sh
cd proxy
npx wrangler kv namespace create RATE_LIMIT   # optional, then uncomment in wrangler.toml
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Then set `RUN_YOUR_OWN_ENABLED=true` for the site build and rebuild.

`.github/workflows/proxy.yml` runs the proxy test suite on every change under `proxy/` and
deploys on manual dispatch when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set.

---

## Testing

```sh
npx vitest run proxy/tests
```

45 tests covering the OIDC flow against a mocked IdP, session issuance and expiry, signature
forgery, the allowlist including every SSRF bypass listed above, CSRF, CORS, streaming relay,
`Set-Cookie` stripping, rate limiting, and a log-inspection test asserting that a request carrying
a realistic API key and a prompt produces a log line containing neither.

**Not yet done:** deployed and exercised against a real En Dash identity provider. Every test here
runs against a mock. The IdP settings above are what the implementation expects; confirm them
against the real issuer's registration before relying on them.
