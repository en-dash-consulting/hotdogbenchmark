# 4. Run it properly

**Implements:** [`src/runner/run.ts`](../../src/runner/run.ts),
[`src/runner/aggregate.ts`](../../src/runner/aggregate.ts)

You have adapters. Now you need to call them a few hundred times without the result being a
measurement of your own impatience.

## Sample more than once

LLM output is not deterministic. Two consecutive identical calls to the same model during
development of this project returned "Yes" and then "No".

That is the entire argument for sampling. One sample tells you what happened once. Three gives
you a majority verdict — three being odd, so a majority exists.

## Medians, not means

With three samples, one cold start drags a mean somewhere unrepresentative and your report ends
up describing an artefact of your collection rather than the model. The median of three is the
middle observation, which is what a reader assumes "typical latency" means anyway.

## Never more than one call in flight per provider

This is the constraint people miss, and it is the important one:

```ts
const index = remaining.findIndex((job) => !busyProviders.has(job.model.provider))
```

The pool picks the next job whose _provider is idle_, not simply the next job.

Three simultaneous requests to one vendor invites a 429. The retried request then has a latency
that reflects your own concurrency rather than the provider's speed — **your benchmark is now
measuring itself.** Samples within a job run sequentially for the same reason.

You want some parallelism, or a run takes an hour. You want it across vendors, not within one.

## A provider being down is a result

Any job that throws becomes a `ModelResult` with `status: "error"` and the run continues. The run
as a whole only fails if _every_ job failed, which means something systemic.

Failed models keep their entry in the published report. Dropping them would quietly bias the
archive toward whichever vendors happened to be up — over a year, that is a real distortion, and
it is invisible.

There is a matching distinction the runner is careful about: a model whose provider has **no key
configured** is _skipped_, not errored. Not being asked is not the same as having failed, and
conflating them would put a fake outage in the archive every week for anyone running with a
partial key set.

## Ties resolve to "other"

A model that answered yes twice and no twice has not given a consistent answer. Reporting either
as "its verdict" would be picking a side on the model's behalf.

## Exercise

Open `tests/runner/run.test.ts` and find _"never has two calls in flight for the same provider"_.

Now go to `src/runner/run.ts` and change `findIndex` to always take index `0` — the naive
implementation. Run `npm test`.

The test fails with `maxInFlight` of 3. That is the bug you would otherwise ship, and it would
show up as unexplained latency variance in your published data six weeks later.

**Next:** [5. Persist versioned data →](05-persistence.md)
