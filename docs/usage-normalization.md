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

**Verified** means a live call was made and the numbers below were read off the response.
**Documented** means the mapping follows the vendor's published API reference but no live call has
been made yet — replace it with a real capture via `npm run bench:record -- --provider <id>` and
change the status.

| Provider                 | Status                  | Input                | Output                 | Total                | Reasoning                                    | Cached input                          | Reasoning inside output?                                                    | Streams (ttfb)? | System prompt via                |
| ------------------------ | ----------------------- | -------------------- | ---------------------- | -------------------- | -------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- | --------------- | -------------------------------- |
| Anthropic                | **Verified 2026-09-02** | `input_tokens`       | `output_tokens`        | derived              | `output_tokens_details.thinking_tokens`      | `cache_read_input_tokens`             | **Yes** — 42 output of which 38 thinking, for the answer "No."              | Yes             | top-level `system`               |
| OpenAI                   | **Verified 2026-09-02** | `usage.input_tokens` | `usage.output_tokens`  | `usage.total_tokens` | `output_tokens_details.reasoning_tokens`     | `input_tokens_details.cached_tokens`  | **Yes** — 17 + 23 = 40, the reported total, and 15 of the 23 were reasoning | Yes             | `instructions`                   |
| Google Gemini            | **Verified 2026-09-02** | `promptTokenCount`   | `candidatesTokenCount` | `totalTokenCount`    | `thoughtsTokenCount`                         | `cachedContentTokenCount`             | **No** — 12 + 2 + 310 = 324, the reported total                             | Yes             | `systemInstruction.parts[].text` |
| xAI                      | **Verified 2026-09-01** | `prompt_tokens`      | `completion_tokens`    | `total_tokens`       | `completion_tokens_details.reasoning_tokens` | `prompt_tokens_details.cached_tokens` | **No** — see below                                                          | Yes             | leading `role: "system"` message |
| Mistral                  | **Verified 2026-09-02** | `prompt_tokens`      | `completion_tokens`    | `total_tokens`       | — (not reported)                             | `prompt_tokens_details.cached_tokens` | n/a                                                                         | Yes             | leading `role: "system"` message |
| DeepSeek                 | Documented              | `prompt_tokens`      | `completion_tokens`    | `total_tokens`       | `completion_tokens_details.reasoning_tokens` | `prompt_cache_hit_tokens`             | **No** — total exceeds prompt + completion                                  | Yes             | leading `role: "system"` message |
| Meta Llama (Together AI) | Documented              | `prompt_tokens`      | `completion_tokens`    | `total_tokens`       | — (not reported)                             | — (not reported)                      | n/a                                                                         | Yes             | leading `role: "system"` message |

### The system prompt column

Experimental conditions (`conditions.json`) send a system prompt under some arms. Every vendor
supports one; no two do it the same way, which is the whole reason the column exists:

- **Anthropic** — a top-level `system` string on the Messages request. There is no
  `role: "system"` message in this API; sending one is an error.
- **OpenAI (Responses API)** — the `instructions` field.
- **Gemini** — `systemInstruction`, shaped like a `contents` entry (`parts`, not a bare string).
- **OpenAI-compatible** (xAI, Mistral, DeepSeek, Together) — a leading `{ role: "system" }`
  message, handled once in `src/providers/openai-compatible.ts`.

Under the control condition no system prompt is sent, and each adapter has a test asserting the
request body is then **byte-identical** to what it sent before the field existed. That is what
makes the control arm the same measurement earlier editions took.

### What verifying these live actually changed

Five of the seven rows above were corrected by making real calls. Every one of
these was invisible to fixture testing, because a fixture only proves the
adapter parses what the vendor _used to_ send:

- **Anthropic reports thinking tokens.** The adapter had `reasoningTokens: null`
  with a comment asserting the Messages API has no such field. It does —
  `output_tokens_details.thinking_tokens`, counted inside `output_tokens`.
- **Gemini's thoughts sit outside `candidatesTokenCount`**, confirmed
  arithmetically: 12 + 2 + 310 = 324. The same shape as xAI, the opposite of
  OpenAI.
- **A 64-token output cap made reasoning models return nothing at all.** A live
  Anthropic call came back `stop_reason: max_tokens` with a single thinking
  block, zero text blocks, and all 64 output tokens counted as thinking. Gemini
  truncated mid-word to "Categorically,". The cap is now 1024.
- **`mistral-large-3-25-12` is a documentation slug, not a model id.** The API
  rejects it as "Invalid model". The live `GET /v1/models` endpoint gives
  `mistral-large-2512`, which then returns 403 on the standard tier — so the
  registry uses `mistral-medium-2604`, which a reader can actually reach.

Prefer a provider's own model-listing endpoint over its prose documentation
wherever one exists.

Each adapter's pull request is expected to keep its own row honest. A stale row here is worse
than a blank one, because a reader will believe it.

### The xAI measurement, in full

This is the clearest illustration of why this document exists, so it is written out rather than
summarized. A live call on 2026-09-01 asking `grok-4.6` "Is a hot dog a sandwich? One word
answer." returned:

```json
{
  "prompt_tokens": 647,
  "completion_tokens": 1,
  "total_tokens": 1295,
  "prompt_tokens_details": { "cached_tokens": 640 },
  "completion_tokens_details": { "reasoning_tokens": 647 }
}
```

Three things follow from those five numbers.

**The total is not the sum of its parts.** 647 + 1 = 648, but the billed total is 1295. The
difference is exactly the reasoning tokens. Deriving `totalTokens` as input + output — the
obvious implementation — would understate this call by half. That is why the schema stores the
vendor's own total and only derives one when the vendor sends none.

**A one-word answer can cost 647 output-side tokens.** `completion_tokens` is 1, and it is
correct: the model said "No". The other 647 went on deciding to. Any chart that ranks models by
output tokens is measuring verbosity for some vendors and thinking for others.

**Time-to-first-token means the first _content_ token.** This call's stream sent
`delta.reasoning_content` chunks for about ten seconds before the first `delta.content` chunk, so
its ttfb is ~9,800 ms for a two-letter answer. The adapter deliberately does not mark reasoning
chunks as the first token: doing so would report a ttfb near zero for a model that had said
nothing yet.

The same prompt on two consecutive calls returned "Yes" and then "No". That is not a bug in
anything; it is why the benchmark takes several samples and reports a majority verdict.

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
