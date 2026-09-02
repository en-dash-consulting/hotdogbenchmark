# hotdogbenchmark

A weekly cross-vendor LLM benchmark that asks every major model whether a hot dog is a sandwich,
under three framings, and publishes the answers as a straight-faced analyst report at
<https://hotdogbenchmark.lol>. The question is silly on purpose; the measurement is not. Read
`AGENTS.md` first: it is the shared guidance for any assistant, and this file only adds what is
specific to working here with Claude Code.

## The three things that must stay true

1. **The published site never calls a provider.** It renders the committed editions in
   `data/runs/` at build time. Live calls happen only from the `bench` CLI or the weekly workflow.
2. **The data contract is the public API.** `src/schema/run.ts` is versioned; older files are
   migrated on read in `src/data/migrate.ts`. Never edit a committed edition by hand, and never
   let mock data overwrite a real one (the CLI refuses; keep it that way).
3. **Every page passes every gate.** axe in four modes, the responsive audit at seven widths, the
   keyboard audit, the contrast test over the token file, the JavaScript budget, and the
   Lighthouse budgets. A change that trips one is not done.

## Working here

- Run `npm run validate` before every commit, and `npm test` builds the site, so a broken page
  fails the suite. For visual work also run `npm run test:a11y`, `npm run test:responsive`, and
  `npm run test:audit` against `dist/`.
- Progressive enhancement: pages must work with scripts off. Client JavaScript is for the
  answer-board replay and the framing explorer only, and the budget is 30 KB gzipped.
- No lint suppressions. The rule keeping `src/providers` and `src/runner` free of Node builtins
  and `process.env` is load-bearing: adapters run in a browser too.
- American spelling everywhere, including copy, comments, and tests.
- Copy is registry-driven. Question text, subjects, claims and taglines come from
  `questions.json`, so a fork asking a different question needs no code edits. Do not hardcode
  "hot dog" outside that file and the README.
- Brand: En Dash navy `#001769`, teal `#00e5b9`, purple `#6c41f0`, orange `#ff5926`; Montserrat
  for headings and interface, Merriweather for prose, both self-hosted under `public/fonts/`.
  Tokens live in `src/site/styles/tokens.css`; add colors there so the contrast test sees them.
- Astro drops the newline between a line of text and a tag on the next line inside expressions.
  Put an explicit `{' '}` at those seams; a build test catches the ones you miss.
- Print matters: each report ships as a PDF rendered from the print stylesheet. Do not declare
  `size-adjust` font faces; Chromium rasterizes SVG text in print when one exists.

## Commits

Small, in the voice of the project: the first line says what changed and why it matters, the
body explains the decision, not the diff. Session-attributed commits carry the trailers Claude
Code adds automatically. The GA4 measurement ID and the provider keys are never committed: the
ID is a repository variable, the keys are Actions secrets read by `benchmark.yml`.

## Product tracking

Requirements live in `.rex/prd_tree/` and are edited through the rex MCP tools
(`get_prd_status`, `add_item`, `update_task_status`, `append_log`), and work is recorded with
`ndx hench record`. The `/ndx-*` skills under `.claude/skills/` wrap that workflow. They are
optional for a contributor; a pull request does not need a PRD item.
