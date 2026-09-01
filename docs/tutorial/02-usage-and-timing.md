# 2. Normalize usage and time it

**Implements:** [`src/providers/timing.ts`](../../src/providers/timing.ts),
[`docs/usage-normalization.md`](../usage-normalization.md)

This is the page where a benchmark stops being easy.

## Token counts are not comparable across vendors

Three independent reasons, each sufficient on its own:

**Different tokenizers.** The same prompt is a different number of tokens at every vendor.

**Different accounting for reasoning.** Some vendors count internal reasoning inside
`output_tokens`. Others report it separately and exclude it.

**Different cache reporting.** Vendors that report cache hits separately show a lower input count
for identical work.

Here is a real measurement from this repository — a live call asking one model the hot dog
question:

```json
{
  "prompt_tokens": 647,
  "completion_tokens": 1,
  "total_tokens": 1295,
  "completion_tokens_details": { "reasoning_tokens": 647 }
}
```

647 + 1 = 648. The billed total is 1295.

**Deriving `totalTokens` as input + output — the obvious implementation — would have understated
that call by half.** This is why the schema stores the vendor's own total and only derives one
when the vendor sends none.

It is also why `completion_tokens: 1` is correct and useless on its own: the model said "No", and
spent 647 tokens deciding to. Any chart ranking models by output tokens is measuring verbosity
for some vendors and thinking for others.

## Null is not zero

```ts
reasoningTokens: number | null // null means "this vendor does not report it"
```

A model with no reasoning-token concept and a model that used no reasoning tokens are different
facts. Collapse them and the first looks efficient for free. The schema keeps them distinct all
the way to the rendered page, where null shows as an em dash with a reason — "not reported by
this provider" — rather than a zero.

## What latency actually measures

`totalMs` is wall-clock from issuing the request to finishing reading the response. It includes
DNS, TLS, network transit, provider queueing, and generation.

**It is not inference speed.** Measuring that would require controlling for network position,
hardware, batching and load, none of which you control when calling a public API.

Say so, loudly, wherever you show the number. This project says it on the methodology page, in
the normalization doc, and in the source comment on the function that computes it.

## Time to first token means the first _content_ token

The same live call took **9.8 seconds** to produce its first content token, for a two-letter
answer. The stream sent reasoning chunks for ten seconds first.

The adapters deliberately do not count those. Marking the first reasoning chunk would report a
near-zero time-to-first-token for a model that had said nothing yet — technically defensible,
completely misleading.

## Exercise

Run `npm run bench:smoke -- --provider xai` if you have an xAI key, or read
`tests/fixtures/responses/xai.json` if you do not.

Compare `inputTokens + outputTokens` against `totalTokens`. Then find the line in
`src/providers/timing.ts` that decides which one to keep, and read the comment above it.

**Next:** [3. Add a second provider →](03-second-provider.md)
