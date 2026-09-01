# Cross-provider usage normalization

Seven vendors report token usage seven different ways. This document records exactly what each
adapter maps onto the shared `Usage` shape, and — more importantly — what those numbers include.

The short version, which you should read even if you skip the tables:

> **Token counts are not comparable across providers.** Do not rank models by them.

## Why not

Three separate reasons, each sufficient on its own.

**Different tokenizers.** The same fifteen-character prompt becomes a different number of tokens
at every vendor. A model that reports 12 input tokens where another reports 15 is not being more
efficient; it is counting differently. This benchmark's prompts are short and nearly identical,
which makes the discrepancy small in absolute terms and _proportionally largest_ — a one-token
difference on a fifteen-token prompt is seven percent.

**Different accounting for reasoning.** Some vendors count internal reasoning tokens inside
`output_tokens`; others report them separately and exclude them. Two models that each produce the
word "No" can therefore report output token counts that differ by a factor of a hundred, with
neither one wrong. The per-provider table below has a column for exactly this.

**Different caching behaviour.** This benchmark sends the same short prompt repeatedly, so prompt
caches hit often. A vendor that reports cached input tokens separately will show a lower
`inputTokens` than one that folds them in, for identical work at a lower price.

What token counts _are_ good for: comparing one model against itself over time, and estimating
cost, which is what this project uses them for.

## The shared shape

Defined in `src/schema/run.ts`, built by `normalizeUsage()` in `src/providers/timing.ts`.

| Field               | Required | Meaning                                                                                                                                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inputTokens`       | yes      | Prompt tokens, as this vendor counts them.                                                                                                                                                 |
| `outputTokens`      | yes      | Generated tokens, as this vendor counts them.                                                                                                                                              |
| `totalTokens`       | yes      | The vendor's own total where it reports one, else input + output. Kept separate because some vendors' totals do not equal the sum of their parts, and their number is the one on the bill. |
| `reasoningTokens`   | nullable | Internal reasoning tokens. **Null means the vendor does not report this**, not that it was zero.                                                                                           |
| `cachedInputTokens` | nullable | Input tokens served from the vendor's prompt cache. Null means not reported.                                                                                                               |

The null-versus-zero distinction is load-bearing. A model with no reasoning-token concept and a
model that used no reasoning tokens are different facts. Collapsing them would make the first look
efficient for free.

## Per-provider mapping

Filled in as each adapter lands. The **Reasoning inside output?** column is the one that changes
how you read a chart.

| Provider                 | Input     | Output    | Total     | Reasoning | Cached input | Reasoning inside output? | Streams (ttfb)? |
| ------------------------ | --------- | --------- | --------- | --------- | ------------ | ------------------------ | --------------- |
| Anthropic                | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| OpenAI                   | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| Google Gemini            | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| xAI                      | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| Mistral                  | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| DeepSeek                 | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |
| Meta Llama (Together AI) | _pending_ | _pending_ | _pending_ | _pending_ | _pending_    | _pending_                | _pending_       |

Every adapter's pull request is expected to fill in its own row. The PR template asks for it, and
a stale row here is worse than an empty one, because a reader will believe it.

## Timing

`src/providers/timing.ts` measures two things, both in milliseconds.

**`totalMs`** — wall clock from issuing the request to finishing reading the response. It includes
DNS, TLS, the network hop, provider-side queueing, and generation. It is **not** inference speed,
and this project never describes it as such.

**`ttfbMs`** — the gap between issuing the request and the first _content_ token arriving. Only
available when the adapter streams. Non-streaming adapters leave it null, which the report shows
as "not reported" rather than as zero. `models.json` records `supportsStreaming` per model so a
null is explicable rather than mysterious.

Both use `performance.now()`, which is monotonic — a clock adjustment mid-request cannot produce
a negative duration.

**`tokensPerSecond`** divides output tokens by _total_ wall-clock time, so it too includes network
and queueing. It is throughput as experienced by the caller.

## What a benchmark run measures about latency

Latency figures here come from a GitHub-hosted runner in a region GitHub chooses and does not
publish. So:

- A provider with a point of presence near that runner looks faster than one without, for reasons
  that have nothing to do with the model.
- Open-weights models are served by a host, and the host's hardware dominates. The Llama row
  measures Together AI's serving, not Meta's model.
- Week-to-week movement can be network conditions rather than anything about the model.

Medians across three samples reduce the noise. They do not remove it. The methodology page says
all of this to readers; this page says it to whoever is writing the next adapter.
