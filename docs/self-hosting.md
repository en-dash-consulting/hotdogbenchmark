# Running your own copy

This guide takes you from a fork to a live site publishing its own weekly benchmark. It assumes
no familiarity with the code.

**You never need to run the benchmark on your own machine.** A scheduled GitHub Action does it,
commits the results, and redeploys the site. Your only recurring cost is the API calls, which are
cents per week. Local runs are for development, not operation.

Total setup time is about fifteen minutes, most of it spent creating API keys.

---

## 1. Fork the repository

Use the **Fork** button on GitHub. Everything below happens in your fork.

If you would rather not publish under your own name, that is fine — nothing in the pipeline
depends on the repository being public _except_ GitHub Pages on a free plan. Private repositories
need GitHub Pro or an organisation plan to publish Pages.

## 2. Enable GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Not "Deploy from a branch". The workflow uploads a build artifact directly; selecting the branch
option will publish your repository's raw files instead of the built site, and the result looks
broken in a confusing way.

You do not need to create a `gh-pages` branch. There isn't one.

## 3. Add your provider keys as secrets

**Settings → Secrets and variables → Actions → New repository secret.**

Add one secret per provider you want to benchmark. All of them are optional — **a provider with
no secret is skipped with a warning, not recorded as a failure** — so start with one and add more
later.

| Secret name         | Provider                    | Where to create the key                       |
| ------------------- | --------------------------- | --------------------------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic                   | <https://console.anthropic.com/settings/keys> |
| `OPENAI_API_KEY`    | OpenAI                      | <https://platform.openai.com/api-keys>        |
| `GOOGLE_API_KEY`    | Google Gemini               | <https://aistudio.google.com/apikey>          |
| `XAI_API_KEY`       | xAI                         | <https://console.x.ai/>                       |
| `MISTRAL_API_KEY`   | Mistral                     | <https://console.mistral.ai/api-keys>         |
| `DEEPSEEK_API_KEY`  | DeepSeek                    | <https://platform.deepseek.com/api_keys>      |
| `TOGETHER_API_KEY`  | Meta Llama, via Together AI | <https://api.together.ai/settings/api-keys>   |

Per-provider free tiers, rate limits and expected weekly cost are in
[`providers.md`](providers.md).

**Set a spend limit in each provider's console.** This benchmark costs cents per week, but a
misconfiguration — a question that provokes long answers, a sample count of 100 — is your money.
Every console offers a cap; use it.

Secrets are only ever read by `benchmark.yml`. The pull-request workflow references none, which
is what makes it safe to run on PRs from strangers.

## 4. Trigger the first run

**Actions → Weekly benchmark → Run workflow.**

It takes a couple of minutes. When it finishes:

- Open the run and read the **step summary** — the yes/no/other tally and a per-model table.
- Check that a commit appeared on `main` adding `data/runs/<iso-week>.json`.
- The **Deploy site** workflow should start on its own immediately afterwards.

When the deploy finishes, your site is at `https://<your-username>.github.io/<repo-name>/`.

## 5. Confirm the schedule

Nothing more is required — `benchmark.yml` already runs every Monday at 12:00 UTC.

To change it, edit the `cron` line:

```yaml
on:
  schedule:
    - cron: '0 12 * * 1' # minute hour day-of-month month day-of-week (1 = Monday)
```

Times are UTC. Avoid running near midnight UTC: several providers schedule rate-limit resets and
maintenance windows around the day boundary, and a benchmark that runs during one measures the
maintenance window rather than the model.

> **GitHub disables scheduled workflows in repositories with no activity for 60 days.** It emails
> you first. A single commit re-enables it. This catches most people who fork a project and come
> back three months later wondering why the data stopped.

## 6. Choose your own models

Edit `models.json`. Each entry:

```json
{
  "provider": "anthropic",
  "modelId": "claude-opus-5",
  "displayName": "Claude Opus 5",
  "vendor": "Anthropic",
  "docsUrl": "https://platform.claude.com/docs/en/about-claude/models/overview",
  "pricing": {
    "inputUsdPerMTok": 5,
    "outputUsdPerMTok": 25,
    "pricingUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
    "asOf": "2026-09-01"
  },
  "supportsStreaming": true,
  "supportsUsage": true,
  "enabled": true
}
```

Set `"enabled": false` to stop asking a model without losing its history. Copy the model ID from
the provider's documentation rather than typing it from memory, and record the page you copied it
from in `docsUrl` — a wrong model ID fails at runtime with a vendor error message that rarely
says "that model does not exist".

Supporting an entirely new _provider_ is one new adapter file; see
[CONTRIBUTING](../CONTRIBUTING.md#adding-a-provider).

## 7. Ask your own questions

This is the point of the project. Edit `questions.json`:

```json
{
  "id": "grilled-cheese",
  "subject": "a grilled cheese",
  "text": "Is a grilled cheese a sandwich? One word answer.",
  "reportTitle": "Sandwich Classification Benchmark: Grilled Cheese Edition",
  "enabled": true
}
```

Two rules the schema enforces: ids are unique, and every `text` ends with `One word answer.` —
that is what makes the one-word compliance metric mean anything. If you want to ask questions of
a different shape, change the suffix in `src/schema/questions.ts` and update the methodology page
to match.

Each additional question multiplies the weekly cost by the number of models times the sample
count. With seven models at three samples and three conditions, one more question is 63 more API calls a week — 21 for the control alone.

## Optional: the "Run your own" page

`RUN_YOUR_OWN_ENABLED=true` at build time emits a `/run/` page describing the planned
bring-your-own-keys capability, plus a nav entry for it. It is **off by default**, and when off
the page is not built at all.

Set `PROXY_ORIGIN` to the deployed proxy as well, or sign-in will never succeed.

Leave both off unless you have deployed the proxy — see [`proxy.md`](proxy.md). Publishing the
page without the backend promises your visitors something you cannot deliver.

## Optional: a custom domain

1. Add a `CNAME` file at the repository root containing your domain, e.g. `bench.example.com`.
2. Point a `CNAME` DNS record at `<your-username>.github.io`.
3. **Settings → Pages → Custom domain**, enter the domain, and enable **Enforce HTTPS**.
4. Add a repository _variable_ (not a secret) named `SITE_URL` with the full origin, e.g.
   `https://bench.example.com`.

That last step matters: without `SITE_URL` the build assumes a project-page base path of
`/<repo-name>/` and every internal link on your custom domain gets that prefix, producing 404s
everywhere while the local build looks perfect.

---

## Troubleshooting

### The site is 404, or every link is broken

Almost always the base path. GitHub Pages serves a project site under `/<repo-name>/`, and the
build derives that from `GITHUB_REPOSITORY`. If you renamed the repository, re-run the deploy so
the new name is picked up. On a custom domain, set the `SITE_URL` variable as above.

### Pages is not enabled

**Settings → Pages** must show source **GitHub Actions**. If Pages was never enabled, the deploy
job fails at `actions/deploy-pages` with a permissions error that does not mention Pages at all.

### A secret is missing

The run succeeds and the report shows fewer models — deliberately, so a partial key set still
produces a usable report. Check the run log for `skip <provider> (no key configured)`. If you
expected a provider to be there, the secret name is probably misspelled; they are case-sensitive
and listed in the table above.

### The deploy does not run after a benchmark

The `workflow_run` trigger only fires for workflow files that exist **on the default branch**. On
a fresh fork it will not fire until the workflows have landed on your `main` at least once. Run
the deploy manually the first time (**Actions → Deploy site → Run workflow**); afterwards it
chains automatically.

### The benchmark job fails entirely

Exit code 1 means _every_ model failed, which is systemic rather than one provider having a bad
day. The workflow opens an issue labelled `benchmark-failure` with a link to the run. Usual
causes, in order: no secrets set at all, an expired key, or a provider changing its wire format —
in which case that adapter's tests will be failing too.

### One provider fails every week

After three consecutive editions the workflow opens an issue labelled `provider-degraded`. Either
fix the key or set `"enabled": false` for that model. Leaving it enabled publishes a permanent
outage in your report, which is worse than not asking.

### I want to test a change without spending money

```sh
npm run bench -- run --mock   # replays recorded fixtures, no keys, no network
npm run dev                   # serve the site over that data
```

`--mock` exercises the entire pipeline except the network call. It is what CI runs on every pull
request.
