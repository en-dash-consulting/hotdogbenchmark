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

The benchmark makes **63 API calls a week**: 3 questions × 7 models × 3 samples.

The prompts are about fifteen tokens and the expected answers are one word, so the calls are
about as small as an LLM call can be.

| Scenario                                       | Weekly       | Monthly     |
| ---------------------------------------------- | ------------ | ----------- |
| All seven models, one-word answers throughout  | **≈ $0.004** | **≈ $0.02** |
| All seven, with reasoning models thinking hard | **≈ $0.46**  | **≈ $2.01** |

Both figures are computed from the per-token rates recorded in `models.json` as of the `asOf`
date in each entry, using 63 calls a week. The low figure assumes 15 input and 3 output tokens
per call. The high figure assumes 700 input and 700 output tokens — which is not hypothetical:
a live call to a reasoning model in this repository recorded 647 prompt tokens and 647 reasoning
tokens _to answer with the single word "No"_.

**Budget for the high figure.** A reasoning model deciding to think carefully about a hot dog is
the normal case, not the pathological one. Two dollars a month is still nothing, but the ratio
between the two columns is the interesting part: **the same benchmark can cost 130× more
depending on which models are enabled.**

Set a spend limit in every console you use. Every one of them offers it.

---

## Per-provider setup

Prices below are from `models.json` and carry the date they were read. Verify before relying on
them; vendors change pricing and promotional rates expire.

### Anthropic

|                  |                                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| Secret name      | `ANTHROPIC_API_KEY`                                                            |
| Create a key     | <https://console.anthropic.com/settings/keys>                                  |
| Free tier        | No standing free tier; new accounts have historically received starting credit |
| Model            | `claude-opus-5` at $5 / $25 per million tokens                                 |
| Estimated weekly | $0.0014 – $0.19                                                                |
| Rate limits      | Tiered by spend. The lowest tier is far above 9 calls a week.                  |

Reports `cache_read_input_tokens`, which matters here: the same short prompt is sent nine times a
week, so cache hits are the normal case.

### OpenAI

|                  |                                                  |
| ---------------- | ------------------------------------------------ |
| Secret name      | `OPENAI_API_KEY`                                 |
| Create a key     | <https://platform.openai.com/api-keys>           |
| Free tier        | Prepaid credit; no standing free tier            |
| Model            | `gpt-5.6-sol` at $4 / $20 per million tokens     |
| Estimated weekly | $0.0011 – $0.15                                  |
| Rate limits      | Tiered by spend; not a constraint at this volume |

Pricing was published as promotional at the time of writing, running at least through
2026-11-21. Re-read the pricing page after that date and update `asOf`.

### Google Gemini

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

|                  |                                                                     |
| ---------------- | ------------------------------------------------------------------- |
| Secret name      | `XAI_API_KEY`                                                       |
| Create a key     | <https://console.x.ai/>                                             |
| Free tier        | Promotional credit has been offered periodically; check the console |
| Model            | `grok-4.6` at $2 / $6 per million tokens                            |
| Estimated weekly | $0.0004 – $0.05                                                     |
| Rate limits      | Not a constraint at this volume                                     |

The one provider whose numbers in this repository come from real measured calls. Its reasoning
tokens are billed **outside** `completion_tokens`, so its real cost is several times what a naive
input-plus-output estimate suggests. Charges a doubled rate above 200k prompt tokens, which this
benchmark never approaches.

### Mistral

|                  |                                                           |
| ---------------- | --------------------------------------------------------- |
| Secret name      | `MISTRAL_API_KEY`                                         |
| Create a key     | <https://console.mistral.ai/api-keys>                     |
| Free tier        | **Yes** — La Plateforme has an experimentation tier       |
| Model            | `mistral-large-3-25-12` at $0.5 / $1.5 per million tokens |
| Estimated weekly | $0.0001 – $0.01                                           |
| Rate limits      | Free-tier limits are generous relative to this workload   |

Mistral's flagship is currently cheaper per token than its mid-tier model, which is unusual
enough to be worth stating rather than assuming is a mistake in the table.

### DeepSeek

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
const calls = questions.length * 3
for (const m of models) {
  const low  = calls * (15 * m.pricing.inputUsdPerMTok / 1e6 + 3 * m.pricing.outputUsdPerMTok / 1e6)
  const high = calls * (700 * m.pricing.inputUsdPerMTok / 1e6 + 700 * m.pricing.outputUsdPerMTok / 1e6)
  console.log(m.provider.padEnd(14), '\$' + low.toFixed(5), 'to \$' + high.toFixed(4))
}"
```
