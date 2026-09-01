## What does this change?

<!-- One or two sentences. If it fixes an issue, write "Fixes #123". -->

## Why?

<!-- What was wrong, or what became possible. -->

## Checklist

- [ ] **No secrets.** No API keys, no `.env` file, no key material in fixtures or test data.
      I checked the diff rather than assuming.
- [ ] Tests added or updated for anything with a branch in it.
- [ ] Fixtures recorded for anything that talks to a network, with keys redacted.
- [ ] Docs updated — `docs/data-schema.md` and `docs/usage-normalization.md` in particular.
- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass locally.
- [ ] No lint suppressions added (`eslint-disable`, `@ts-ignore`, or similar). If a rule fired,
      the code changed instead.

## If this adds or changes a provider

- [ ] Model ID verified against the provider's current documentation, with `docsUrl` recorded.
- [ ] Row added to `docs/usage-normalization.md`, including whether reasoning tokens are counted
      inside output tokens for this vendor.
- [ ] Key variable added to `.env.example` and `src/env.ts`.
- [ ] Adapter imports no `node:` builtins and reads no `process.env`.
