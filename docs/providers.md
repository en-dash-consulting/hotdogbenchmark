# Provider setup, free tiers, and what this actually costs

Everything you need to point this benchmark at your own account. All seven providers are
optional — **a provider with no key is skipped with a warning, not recorded as a failure** — so
start with one and add more when you feel like it.

If you only want to work on the code, you need none of them:

```sh
npm run bench -- run --mock
```

---

## The short version on cost

**Measured, not estimated.** A real control-only run on 2026-09-02 across five providers cost
**$0.037** for 43 samples. Projected to all seven providers at 63 control calls a week: roughly
**$0.04 a week, or $0.18 a month.**

**Experimental conditions multiply that linearly.** Every question is asked under every enabled
condition in `conditions.json` — three as shipped (control, asserted, denied) — so the full matrix
is 3 conditions × 3 questions × 7 models × 3 samples = **189 calls a week, roughly $0.12 a week or
$0.55 a month.** Still cents, but three times the cents, and the methodology page says so to
readers as well.

| Measure                                    | Value                                                    |
| ------------------------------------------ | -------------------------------------------------------- |
| Calls per week, control only               | 63 (3 questions × 7 models × 3 samples)                  |
| Calls per week, all three conditions       | 297 (3 conditions × 3 questions × 11 models × 3 samples) |
| Measured cost, control only, 5 providers   | **$0.037** for 43 samples                                |
| Projected weekly, all 7, control only      | **≈ $0.04**                                              |
| Measured weekly, 11 models, all conditions | **$0.25** (2026-09-01, 297 samples)                      |
| Projected monthly, all conditions          | **≈ $1.10**                                              |

**A fork does not have to pay for the conditions.** Set `enabled: false` on every condition but
`control` in `conditions.json`, or pass `--conditions control` to `bench run` (the workflow's
`conditions` input does the same), and the run is exactly the 63-call benchmark it was before
conditions existed. The control cannot be disabled — every other arm is measured against it.

### What the conditions are

| Condition  | System prompt sent             | Purpose                                                         |
| ---------- | ------------------------------ | --------------------------------------------------------------- |
| `control`  | none                           | The baseline. What every edition before schema version 2 asked. |
| `asserted` | `A hot dog is a sandwich.`     | Does the model adopt an affirmative premise stated as fact?     |
| `denied`   | `A hot dog is not a sandwich.` | The mirror, so suggestibility is measured in both directions.   |

The `{subject}` in each template is rendered per question, so the taco question is told about
tacos, not hot dogs. The exact string sent is recorded on every cell of the run file.

A condition can also set `reasoningEffort` (`low`, `medium`, `high`, `xhigh`), so a "think less"
arm is a data change: add an entry with no system prompt and `"reasoningEffort": "low"`, and every
model whose vendor exposes an effort control (xAI, OpenAI, and the OpenAI-compatible dialect) is
asked again at that effort. It is not enabled by default because it is another full arm of
calls; the cost multiplies the same way the system-prompt arms do.

### Where the money actually goes

Not where you would guess. Median output tokens per model, from that same run:

| Model              | Median output tokens | Share of run cost |
| ------------------ | -------------------- | ----------------- |
| Claude Opus 5      | 130                  | ~60%              |
| GPT-5.6 Sol        | 6                    | ~5%               |
| Mistral Medium 3.5 | 3                    | ~1%               |
| Gemini 3.7 Flash   | 1                    | <1%               |
| Grok 4.6           | 1                    | ~30%              |

**One model accounts for most of the bill, and it is not the one that talks the most.** Two
separate effects:

- **Reasoning tokens are billed but mostly invisible.** Claude answers "No." — two visible tokens
  — while spending ~130 output tokens, the rest on thinking. Grok answers with a single token
  while spending ~500 reasoning tokens that are billed _outside_ its completion count.
- **Price per token varies 10x across this field**, from $1.04/MTok to $25/MTok on output.

An earlier version of this page assumed 3 output tokens per call and quoted a floor of $0.004 a
week. That floor was never reachable: every reasoning model in this field thinks before answering,
so the realistic figure is the one measured above. Recompute yours after changing models rather
than trusting either number.

### The cap matters more than you would expect

`DEFAULT_MAX_OUTPUT_TOKENS` is 1024. It was 64, which was too low — reasoning models spent the
entire budget thinking and returned _empty answers_. Raising it fixed the data and raised the
cost; both were the right trade, since an empty answer costs the same as a real one and is worth
nothing.

If you lower it to save money, check that your models still answer. `npm run bench:smoke -- --all`
will show you immediately.

Set a spend limit in every console you use.

## Several models per provider

A provider can contribute as many models as `models.json` lists, and the current registry has
three each from Anthropic, OpenAI and xAI and two from Mistral. The scheduling rule is per
provider, not per model: the runner still never has more than one call in flight to a vendor, so
adding a model lengthens a run rather than hammering the vendor harder. Each model has its own
mock fixture (`tests/fixtures/responses/<provider>--<model-slug>.json`; the provider's first model
keeps the plain `<provider>.json`), recorded with:

```sh
npm run bench:record -- --provider openai --model gpt-5.4-mini
npm run bench:smoke -- --provider openai --model gpt-5.4-mini   # one live call
npm run bench:smoke -- --all                                    # every enabled model with a key
```

Model ids come from each vendor's live model-listing endpoint, not from prose docs, for the
reason in the Mistral notes below.

## Per-provider setup

Prices below are from `models.json` and carry the date they were read. Verify before relying on
them; vendors change pricing and promotional rates expire.

### Anthropic

|                  |                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Secret name      | `ANTHROPIC_API_KEY`                                                                                                   |
| Create a key     | <https://console.anthropic.com/settings/keys>                                                                         |
| Free tier        | No standing free tier; new accounts have historically received starting credit                                        |
| Models           | `claude-opus-5` at $5 / $25, `claude-sonnet-5` at $2 / $10, `claude-haiku-4-5-20251001` at $1 / $5 per million tokens |
| Estimated weekly | $0.0014 – $0.19                                                                                                       |
| Rate limits      | Tiered by spend. The lowest tier is far above 9 calls a week.                                                         |

Reports `cache_read_input_tokens`, which matters here: the same short prompt is sent nine times a
week, so cache hits are the normal case.

### OpenAI

|                  |                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Secret name      | `OPENAI_API_KEY`                                                                                     |
| Create a key     | <https://platform.openai.com/api-keys>                                                               |
| Free tier        | Prepaid credit; no standing free tier                                                                |
| Models           | `gpt-5.6-sol` at $4 / $20, `gpt-5.5` at $5 / $30, `gpt-5.4-mini` at $0.75 / $4.50 per million tokens |
| Estimated weekly | $0.0011 – $0.15                                                                                      |
| Rate limits      | Tiered by spend; not a constraint at this volume                                                     |

Pricing was published as promotional at the time of writing, running at least through
2026-11-21. Re-read the pricing page after that date and update `asOf`.

### Google Gemini

**Disabled in `models.json` as of 2026-09-01:** the free-tier daily quota was exhausted during
fixture recording and every call returned 429. Set `enabled: true` once the quota resets or the
key is on a paid tier, then `npm run bench:record -- --provider gemini`.

|                  |                                                                                 |
| ---------------- | ------------------------------------------------------------------------------- |
| Secret name      | `GOOGLE_API_KEY`                                                                |
| Create a key     | <https://aistudio.google.com/apikey>                                            |
| Free tier        | **Yes** — AI Studio offers a genuine free tier with daily request limits        |
| Model            | `gemini-3.7-flash` at $0.75 / $3.75 per million tokens                          |
| Estimated weekly | $0.0002 – $0.03                                                                 |
| Rate limits      | Free-tier limits are per-minute and per-day; 9 calls a week is well inside them |

Introductory pricing runs through 2026-12-31, after which it doubles. **Start here if you want
one key that costs nothing.**

### xAI

|                  |                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Secret name      | `XAI_API_KEY`                                                                                            |
| Create a key     | <https://console.x.ai/>                                                                                  |
| Free tier        | Promotional credit has been offered periodically; check the console                                      |
| Models           | `grok-4.6` at $2 / $6, `grok-4.3` and `grok-4.20-0309-non-reasoning` at $1.25 / $2.50 per million tokens |
| Estimated weekly | $0.0004 – $0.05                                                                                          |
| Rate limits      | Not a constraint at this volume                                                                          |

The one provider whose numbers in this repository come from real measured calls. Its reasoning
tokens are billed **outside** `completion_tokens`, so its real cost is several times what a naive
input-plus-output estimate suggests. Charges a doubled rate above 200k prompt tokens, which this
benchmark never approaches.

### Mistral

|                  |                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Secret name      | `MISTRAL_API_KEY`                                                                              |
| Create a key     | <https://console.mistral.ai/api-keys>                                                          |
| Free tier        | **Yes** — La Plateforme has an experimentation tier                                            |
| Models           | `mistral-medium-2604` at $1.5 / $7.5, `mistral-small-2603` at $0.15 / $0.60 per million tokens |
| Estimated weekly | $0.0001 – $0.01                                                                                |
| Rate limits      | Free-tier limits are generous relative to this workload                                        |

Mistral's flagship is currently cheaper per token than its mid-tier model, which is unusual
enough to be worth stating rather than assuming is a mistake in the table.

### DeepSeek

**Disabled in `models.json` as of 2026-09-01:** the key authenticates but the account has no
credit, so every call returns 402 Insufficient Balance. Add credit, set `enabled: true`, and
record the fixture.

|                  |                                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Secret name      | `DEEPSEEK_API_KEY`                                               |
| Create a key     | <https://platform.deepseek.com/api_keys>                         |
| Free tier        | Prepaid credit                                                   |
| Model            | `deepseek-v4-pro` at $0.66 / $1.98 per million tokens (off-peak) |
| Estimated weekly | $0.0001 – $0.02                                                  |
| Rate limits      | Not a constraint at this volume                                  |

**Bills different rates at different times of day.** Peak is 01:00–04:00 and 06:00–10:00 UTC on
weekdays. The weekly job runs Monday 12:00 UTC, which is off-peak, so the off-peak rate is what
`models.json` records. If you move the cron, check whether you moved into peak hours.

### Meta Llama, via Together AI

**Disabled in `models.json` as of 2026-09-01:** no `TOGETHER_API_KEY` is configured. Set one,
set `enabled: true`, and record the fixture.

Provider id `llama-hosted`.

|                  |                                                                               |
| ---------------- | ----------------------------------------------------------------------------- |
| Secret name      | `TOGETHER_API_KEY`                                                            |
| Create a key     | <https://api.together.ai/settings/api-keys>                                   |
| Free tier        | Starting credit on signup                                                     |
| Model            | `meta-llama/Llama-3.3-70B-Instruct-Turbo` at $1.04 / $1.04 per million tokens |
| Estimated weekly | $0.0002 – $0.01                                                               |
| Rate limits      | Serverless tier limits are far above this workload                            |

**Why Together and not Groq.** Groq is faster, but in June 2026 it moved its Llama models to
enterprise-only "contact sales" pricing, which a forker on a free or developer tier cannot use.
Together serves Llama on serverless inference at published per-token rates, so the numbers here
are numbers anyone can check.

Remember what this row measures: the weights are Meta's, but the hardware, batching and queueing
are Together's. **It measures Together's serving, not Meta's model.**

---

## Which key should I get first?

**Google Gemini.** It has a real free tier, the setup is a single click in AI Studio, and it
exercises the interesting parts of the pipeline — it reports reasoning tokens separately from
output tokens, so you will see the normalization logic doing actual work.

Then Mistral, which also has a free tier and is a plain OpenAI-compatible endpoint.

---

## Checking a key works

```sh
npm run bench -- providers                     # which keys are set (never prints a key)
npm run bench:smoke -- --provider gemini       # one live call: text, usage, timing
```

`bench:smoke` makes exactly one request. It costs a fraction of a cent and tells you immediately
whether the key, the model ID and the adapter all work — which is much faster than discovering it
from a failed weekly run.

---

## Where keys live

Locally in `.env`, which is gitignored. In CI as GitHub Actions repository secrets, read only by
`benchmark.yml`. Never anywhere else. The full handling is in
[SECURITY.md](../SECURITY.md), and [self-hosting.md](self-hosting.md) walks through adding them
to your fork.

One module in the entire codebase reads `process.env` for a provider key: `src/env.ts`. Adapters
receive credentials by injection and are forbidden by an ESLint rule from reading the
environment at all.

---

## Recomputing these figures

The cost estimates above come from the pricing table. To recompute after changing models or
questions:

```sh
node -e "
const models = require('./models.json').models.filter(m => m.enabled)
const questions = require('./questions.json').questions.filter(q => q.enabled)
const conditions = require('./conditions.json').conditions.filter(c => c.enabled)
const calls = conditions.length * questions.length * 3
for (const m of models) {
  const low  = calls * (15 * m.pricing.inputUsdPerMTok / 1e6 + 3 * m.pricing.outputUsdPerMTok / 1e6)
  const high = calls * (700 * m.pricing.inputUsdPerMTok / 1e6 + 700 * m.pricing.outputUsdPerMTok / 1e6)
  console.log(m.provider.padEnd(14), '\$' + low.toFixed(5), 'to \$' + high.toFixed(4))
}"
```
