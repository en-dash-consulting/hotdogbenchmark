# Launch checklist

What is done, and what cannot be done from a repository with no GitHub remote.

## Done in the repository

- [x] `LICENSE` — MIT, correct holder and year (2026)
- [x] `CHANGELOG.md` for 0.1.0, with an explicit "pending before 1.0.0" section
- [x] `.github/dependabot.yml` for npm and github-actions, grouped weekly
- [x] `SECURITY.md` with a working contact address
- [x] README badges pointing at this repository's workflows
- [x] Generated OpenGraph cards under `dist/og/`, suitable for the social preview
- [x] `docs/launch-post.md` drafted, with its own pre-publication checklist

## Requires the repository to exist on GitHub

None of these can be done from a local checkout with no remote. They are UI or
API actions against a repository that does not yet exist.

- [ ] Create the repository and push
- [ ] **Settings → General → Description:**
      `A weekly cross-vendor LLM benchmark that asks every major model whether a hot dog is a
    sandwich, published as a straight-faced analyst report. A teaching project.`
- [ ] **Settings → General → Topics:**
      `llm`, `benchmark`, `ai`, `astro`, `github-pages`, `tutorial`, `hotdog`,
      `anthropic`, `openai`, `typescript`
- [ ] **Settings → General → Social preview:** upload `dist/og/default.png`
- [ ] **Settings → Pages → Source: GitHub Actions**
- [ ] Add provider secrets (see [`self-hosting.md`](self-hosting.md))
- [ ] Confirm the badges render and the live link resolves

## Requires a real benchmark run first

**Do not tag `v1.0.0` yet.** The site currently renders a run marked `isMock: true`. Tagging a
1.0.0 whose published data is simulated would undercut the one thing this project takes
seriously.

Order of operations:

1. Add provider secrets.
2. Run `benchmark.yml` via workflow_dispatch.
3. Confirm the committed run has `status: "ok"` for every enabled model, or file an issue per
   failure and decide whether to disable that model.
4. Confirm `deploy.yml` ran and the live site shows the real edition.
5. Remove the sample run from `data/runs/` (it is preserved under
   `tests/fixtures/responses/`).
6. Spot-check three model cards against the raw JSON.
7. Verify the OG image, both feeds, and the archive page for the new week.
8. Then: `git tag -a v1.0.0` and publish a release using the 0.1.0 changelog section as notes.

## Also outstanding

Tracked in the PRD, and listed in `CHANGELOG.md` under "Pending before 1.0.0":

- Six of seven adapters have never been exercised against a live API.
- No screen-reader pass — see [`a11y-checklist.md`](a11y-checklist.md).
- The proxy has never run against a real En Dash identity provider.
