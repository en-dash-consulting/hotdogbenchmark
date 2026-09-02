# Fork this and ask your own question

This is the start-to-finish path from a fork to a deployed GitHub Pages site that asks the models
_your_ question every week. It names the exact file or command at each step. The running example
is **"Is a burrito a sandwich?"**. Substitute your own question wherever you see it.

If you only want to run the shipped hot dog benchmark under your own account, the shorter
[`self-hosting.md`](self-hosting.md) is enough. This guide is for changing what gets asked.

Budget about an hour, most of it waiting on API consoles. Expect to spend under a dollar.

---

## 1. Fork and clone

Use the **Fork** button on GitHub, then:

```sh
git clone https://github.com/<your-username>/hotdogbenchmark.git
cd hotdogbenchmark
nvm use          # Node version is pinned in .nvmrc
npm install
```

## 2. Add your keys

```sh
cp .env.example .env
```

Open `.env` and fill in whichever provider keys you have. Every key is optional. A provider with
no key is skipped with a warning, not recorded as a failure. `.env` is gitignored; it never leaves
your machine. Check what is set without printing anything secret:

```sh
npm run bench -- providers
```

Where to create each key, free tiers, and per-provider cost are in [`providers.md`](providers.md).
Set a spend limit in every console you use.

## 3. Replace the questions

Edit `questions.json`. Delete the hot dog, hamburger and taco entries and add yours:

```json
{
  "id": "burrito",
  "subject": "a burrito",
  "claim": "is a sandwich",
  "denial": "is not a sandwich",
  "text": "Is a burrito a sandwich? One word answer.",
  "reportTitle": "The Burrito Question",
  "tagline": "Bread on all sides. Massachusetts said no in 2006.",
  "enabled": true
}
```

Field by field:

- `id` is a lowercase slug. It appears in URLs and in run files, so pick it once.
- `subject` is the noun phrase with its article, lowercase: `a burrito`. It is dropped into the
  framing templates in the next step and into generated prose.
- `claim` and `denial` are the two answers as predicates on the subject: `is a sandwich` and
  `is not a sandwich`. The site builds its own copy from them: the answer board's framing
  buttons read "Tell them a burrito is a sandwich", and the About and Methodology pages say what
  the question contests. For "Is cereal a soup?" they would be `is a soup` and `is not a soup`.
  Both are optional; without them the site falls back to the framing labels from
  `conditions.json` and quotes the question text.
- `text` is the exact prompt sent to every model. The schema requires it to end with
  `One word answer.` so the one-word compliance metric means something.
- `reportTitle` and `tagline` are the report page's heading and the line under it.

One more rule, enforced by mock mode rather than the schema: the `id` with dashes turned into
spaces must appear in `text`. That is how the mock adapter finds a recorded answer for a prompt.
`burrito` appears in "Is a burrito a sandwich?", so this passes.

Keep the file to one question while you are setting up. Every question multiplies the weekly
call count by models times framings times samples, so add the second and third once the first
one works. Validate the registry at any point with:

```sh
npm run bench -- run --dry-run
```

## 4. Edit the framings

Edit `conditions.json`. Each entry is one arm of the experiment. The first must be `control`,
with `systemPrompt`, `promptPrefix`, `promptSuffix` and `temperature` all `null`. It cannot be
disabled; every other arm is measured against it.

The other two shipped arms are `asserted` and `denied`. Their `systemPrompt` fields are templates:

```json
"systemPrompt": "{subject} is a sandwich."
```

`{subject}` is replaced at run time with each question's `subject`, and when the placeholder
opens the template the first letter is capitalized. For the burrito question this arm sends the
system prompt `A burrito is a sandwich.` and the `denied` arm sends `A burrito is not a sandwich.`
The rendered string is recorded on every cell of the run file.

If your question is a sandwich question, the shipped framings already work. If it is not, rewrite
the templates to state your question's answer as fact. For "Is cereal a soup?" you would write
`{subject} is a soup.` and `{subject} is not a soup.` Update each arm's `description` too; the
methodology page prints it.

`promptPrefix` and `promptSuffix` wrap the user message the same way, `temperature` overrides the
sampling temperature, and `reasoningEffort` (`low`, `medium`, `high`, `xhigh`) sets the effort on
vendors that expose one. Set `enabled: false` on any arm you do not want to pay for, or run with
`--conditions control` for the cheapest possible edition.

## 5. Choose the models

Edit `models.json`. Flip `enabled` to `false` on any model you do not want to ask; its history
stays in the archive. To add a model on a provider that already has an adapter, copy a sibling
entry and change `modelId`, `displayName`, `docsUrl`, `pricing` and `notes`:

```json
{
  "provider": "anthropic",
  "modelId": "claude-sonnet-5",
  "displayName": "Claude Sonnet 5",
  "vendor": "Anthropic",
  "docsUrl": "https://platform.claude.com/docs/en/about-claude/models/overview",
  "pricing": {
    "inputUsdPerMTok": 2,
    "outputUsdPerMTok": 10,
    "pricingUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
    "asOf": "2026-09-01"
  },
  "supportsStreaming": true,
  "supportsUsage": true,
  "enabled": true,
  "notes": "Where the id and prices came from, and when."
}
```

Read `modelId` from the provider's live model-listing endpoint where one exists, not from prose
docs; the Mistral notes in `models.json` explain why. Stamp `pricing.asOf` with the date you read
the prices. A provider not in the list needs an adapter; see step 12.

## 6. Prove the pipeline in mock mode

```sh
npm run bench -- run --mock --out tmp/mock-run.json
```

Mock mode replaces every adapter with a replayer that reads `tests/fixtures/responses/` and runs
everything else for real: classification, aggregation, cost estimation, schema validation, the
manifest. It refuses to overwrite a real edition, which is why `--out` is there.

**The shipped fixtures were recorded for the hot dog questions.** With your questions in place,
mock mode reports `No recorded response for this prompt` for every model until you record new
fixtures. Recording is one live call per question per framing, per model, with the key from
step 2:

```sh
npm run bench:record -- --provider anthropic                          # the provider's first model
npm run bench:record -- --provider anthropic --model claude-sonnet-5  # each further model
```

The first model of a provider writes `tests/fixtures/responses/<provider>.json`; other models
write `<provider>--<model-slug>.json`. Repeat per provider and model, then run the mock command
again and it will show your question. Commit the fixtures; they contain no key material, and a
test checks that.

If you would rather see mock mode work before touching anything, run it once at step 1, when
the fixtures still match the questions.

## 7. One live call per model

```sh
npm run bench:smoke -- --provider anthropic     # one call: text, usage, timing
npm run bench:smoke -- --all                    # every enabled model with a key
```

Smoke makes exactly one request per model and prints what came back. It costs a fraction of a
cent and catches a wrong model id, an expired key, or an adapter that no longer matches the wire
format, which is much cheaper to learn here than from a failed weekly run.

## 8. Run a real edition

```sh
npm run bench -- run
```

This writes `data/runs/<iso-week>.json` and regenerates `data/index.json`. Re-running in the same
week replaces that file and moves the old one to `data/runs/superseded/`, so nothing you paid for
is lost. Narrow a run with `--models`, `--questions`, `--conditions` or `--samples` while you are
iterating.

Cost: the shipped configuration of 11 enabled models, three framings, three questions and three
samples measured at about $0.25 per edition. One question is a third of that. The bill is
dominated by reasoning tokens, not visible output, so recompute after changing models rather than
scaling this number.

The repository ships with a real hot dog edition. To start your archive clean, delete
`data/runs/*.json` and `data/runs/superseded/` before this step and run `npm run data:index`.

## 9. Look at it

```sh
npm run dev
```

Open <http://localhost:4321>. The site reads `data/` at build time, so every edition in
`data/runs/` is a page. Check the report title, the tagline, and the framing descriptions from
step 4; they are all rendered from the registries you edited.

## 10. Push and deploy

Commit `questions.json`, `conditions.json`, `models.json`, the fixtures, and the data, then push
to `main`. Do not commit `.env`.

Then, in your fork on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** Not "Deploy from a
   branch"; there is no `gh-pages` branch.
2. **Settings → Secrets and variables → Actions → New repository secret**, one per provider,
   named exactly as in `.env.example` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and so on).
3. **Actions → Weekly benchmark → Run workflow.** The form has three inputs: `samples` (default
   3), `models` (comma-separated ids, blank for all enabled) and `conditions` (blank for all
   enabled, `control` for the cheap path). Leave them blank for a full edition.

The run takes a few minutes and commits `data/runs/<iso-week>.json` to `main`. The **Deploy site**
workflow then runs on its own. The first time on a fresh fork it may not chain, because the
`workflow_run` trigger only fires once the workflow file exists on the default branch; run
**Actions → Deploy site → Run workflow** by hand once. Your site is then at
`https://<your-username>.github.io/<repo-name>/`.

If a step fails, the troubleshooting section of [`self-hosting.md`](self-hosting.md#troubleshooting)
covers the usual causes: Pages not enabled, a misspelled secret, the base path on a custom domain.

## 11. What the weekly cron does

`.github/workflows/benchmark.yml` runs every Monday at 12:00 UTC. Each run:

1. Installs dependencies and runs `npm run bench -- run` with your secrets as environment
   variables. A provider with no secret is skipped.
2. Validates the output with `npm run data:validate` and regenerates `data/index.json`.
3. Writes a step summary with the yes/no/other tally and a per-model table.
4. Commits `data/` to `main` if anything changed. Deploy rebuilds the site from that commit.
5. Opens or updates an issue labeled `benchmark-failure` if every model failed, and one labeled
   `provider-degraded` if a provider has produced no data for three editions running.

Change the day or hour by editing the `cron` line. Times are UTC. GitHub disables the schedule
in repositories with no activity for 60 days; a single commit re-enables it.

## 12. Adding a provider

A vendor not in the list needs an adapter. It is five small changes, one file each:

| Change           | Where                                                             |
| ---------------- | ----------------------------------------------------------------- |
| The adapter      | `src/providers/<provider>.ts`, copied from `anthropic.ts`         |
| The registration | one `registerAdapter(...)` line in `src/providers/all.ts`         |
| The key variable | one entry in `CREDENTIAL_ENV_VARS` in `src/providers/registry.ts` |
| The fixture      | `npm run bench:record -- --provider <provider>`                   |
| The model        | one entry in `models.json` with `"provider": "<provider>"`        |

Then add the variable to `.env.example`, pass it through in the `env` block of
`.github/workflows/benchmark.yml`, and add it as a repository secret. The adapter receives its
credential and `fetch` by injection and may not import Node builtins or read `process.env`; the
linter enforces both. Verify with `npm run bench:smoke -- --provider <provider>`. The full
checklist is in [CONTRIBUTING](../CONTRIBUTING.md#adding-a-provider).
