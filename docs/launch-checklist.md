# Launch checklist

The state of the launch as of 2026-09-02. Everything below the first section is done.

## Still to do

- [ ] Tag `v1.0.0` and publish the release, using the 1.0.0 section of `CHANGELOG.md` as the
      notes: `git tag -a v1.0.0 -m "First edition" && git push --tags`, then
      `gh release create v1.0.0 --notes-file CHANGELOG.md`.
- [ ] Re-upload the social preview from <https://hotdogbenchmark.lol/og/default.png>, which now
      carries the En Dash square.
- [ ] Register the property with search-ops: `robots.txt`, `sitemap.xml`, `llms.txt` and the
      IndexNow key file are live.
- [ ] Fund DeepSeek and add a Together key, then re-enable those models in `models.json` and
      close the adapter-verification task.
- [ ] The manual screen-reader, voice-control and touch pass, written up in
      [`a11y-checklist.md`](a11y-checklist.md).

## Done

- [x] Repository at `en-dash-consulting/hotdogbenchmark`, public, description, homepage and
      topics set, Dependabot on and its first six updates merged
- [x] GitHub Pages from the Actions workflow, custom domain `hotdogbenchmark.lol`, HTTPS
      enforced, `www` redirecting to the apex, a real 404
- [x] DNS at the registrar, verified with the commands in
      [`launch-dns-and-hosting.md`](launch-dns-and-hosting.md)
- [x] Provider keys as Actions secrets; GA4 measurement ID as the repository variable
      `PUBLIC_GA_MEASUREMENT_ID`
- [x] The org ruleset on `main` no longer requires a pull request, so the weekly workflow can
      commit its edition; deletion and force-push protection stay on
- [x] First workflow-produced edition (Week 36, 2026) committed by the bot and published
- [x] `LICENSE` (MIT, 2026), `SECURITY.md` with a working contact, `.well-known/security.txt`
- [x] `CHANGELOG.md` cut for 1.0.0
- [x] README with badges, live link, screenshots, quickstart, and the repository layout
- [x] OpenGraph cards per page, generated at build; `docs/launch-post.md` drafted
- [x] CI green: lint, typecheck, unit and browser tests, data validation, site build, axe in
      four modes, responsive audit at seven widths, Lighthouse at 100 in every category

## Also tracked in the PRD

- Six of seven adapters are verified live; DeepSeek and Together wait on accounts.
- The proxy for the deferred "run your own" page has never run against a real identity
  provider and is off by default.
- User voting is deferred until after launch.
