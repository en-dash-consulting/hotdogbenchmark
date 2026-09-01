# Security Policy

This project talks to seven commercial AI APIs on a schedule. That means it handles API keys,
and API keys are the only thing here worth stealing. This document says exactly how they are
handled and how to tell us when something goes wrong.

## How API keys are handled

**Locally.** Keys live in a `.env` file that is never committed. `.gitignore` excludes `.env`
and every `.env.*` variant except `.env.example`, which contains variable _names_ only. If you
find yourself pasting a key into any file that is not `.env`, stop.

**In CI.** Keys are GitHub Actions repository secrets, injected as environment variables into
the weekly benchmark job only. The pull-request workflow (`ci.yml`) references no secrets at
all, which is what makes it safe to run on pull requests from forks.

**In code.** Exactly one module reads provider keys from the environment: `src/env.ts`. Adapters
receive credentials through an injected `AdapterContext` and are forbidden by an ESLint rule
from touching `process.env`. Nothing under `src/providers` or `src/runner` can read a key from
ambient state even by accident.

**In output.** Run files under `data/` contain model answers, token counts, and timings. They
never contain request headers. Retry logging deliberately omits headers so an `Authorization`
or `x-api-key` value cannot reach a log. Recorded test fixtures are redacted when captured, and
a test scans the fixture directory for key-shaped strings.

**In the published site.** The site is static. It holds no keys and makes no requests to any
provider. The deferred "run your own benchmark" feature keeps a visitor's keys in browser
session storage and forwards them per request to a proxy that never persists or logs them; that
design is documented in `docs/proxy.md` before any of it is built.

## Reporting a vulnerability

Email **nick@endash.us** with `hotdogbenchmark security` in the subject. Please include what you
found, how to reproduce it, and what you think the impact is. You will get an acknowledgement
within seven days.

Please do not open a public issue for a vulnerability. Do open a public issue for anything else.

## Reporting a leaked key

If you believe a key has been committed to this repository or exposed in a workflow log:

1. **Revoke the key in the provider's console first.** Rotation beats investigation.
2. Email the address above so the secret can be replaced and the history checked.
3. If it is your own key in your own fork, revoke it and rotate — a key in git history is
   compromised even after the commit is removed.

## Scope

In scope: this repository's code, workflows, data, and the proxy under `proxy/` if present.

Out of scope: vulnerabilities in the AI providers' own APIs (report those to the vendor), and
the accuracy of any claim this project makes about whether a hot dog is a sandwich.
