# 1. Write one adapter

**Implements:** [`src/providers/types.ts`](../../src/providers/types.ts),
[`src/providers/anthropic.ts`](../../src/providers/anthropic.ts)

## The whole interface

```ts
export interface ProviderAdapter {
  readonly id: string
  readonly displayName: string
  complete(request: CompleteRequest, context: AdapterContext): Promise<CompleteResult>
}
```

One method. That is the entire abstraction, and keeping it that small is a decision you have to
actively defend, because every vendor will tempt you to widen it.

## What is deliberately _not_ in it

**The model ID.** The adapter is told which model to use. It does not choose, and it does not
know what models exist.

**The API key.** It arrives in `context.credentials`. The adapter never reads `process.env`.

**`fetch`.** It arrives in `context.fetch`. The adapter never reaches for the global.

Those last two look like ceremony. They are the reason the same adapter can be tested with no
network, run in a browser, and be routed through a proxy — and the reason an ESLint rule fails
the build if any file under `src/providers` imports a `node:` builtin.

That rule is worth stealing. The cost of the constraint up front is nearly zero. The cost of
retrofitting it across seven adapters later is a weekend.

## Read the reference adapter

[`src/providers/anthropic.ts`](../../src/providers/anthropic.ts) is written to be read first:
linear, under 150 lines of code, and commented wherever the reason for a line is not obvious.

Its shape is the shape every adapter has:

1. Turn the request into this vendor's format.
2. Send it through the shared HTTP helper.
3. Read the response, marking the first token.
4. Map the vendor's usage payload onto the shared shape.
5. Let every failure surface as a `ProviderError`.

## Errors are part of the interface

Seven vendors report failures seven ways. The runner needs exactly two things from a failure: is
it worth retrying, and what does the report say happened. So every adapter converts whatever it
caught into a `ProviderError` with one of six categories.

One category is worth calling out. `bad_response` — a 2xx whose body you could not interpret —
is deliberately **not** retryable. A body you could not parse will parse exactly as badly the
second time, and retrying it spends money to learn nothing.

## Exercise

Open `tests/providers/anthropic.test.ts` and find the test named _"maps a 200 with no usage data
to bad_response, since a retry gets the same body"_.

Now go to `src/providers/anthropic.ts` and delete the check that throws it. Run
`npm test`. Then look at what the adapter returns instead: a result with zero tokens, which would
flow all the way into a published report as a model that answered for free.

Put it back.

**Next:** [2. Normalize usage and time it →](02-usage-and-timing.md)
