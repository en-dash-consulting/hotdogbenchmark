# 7. Present it honestly

**Implements:** [`src/site/pages/methodology.astro`](../../src/site/pages/methodology.astro),
[`src/site/lib/scores.ts`](../../src/site/lib/scores.ts),
[`src/site/lib/prose.ts`](../../src/site/lib/prose.ts)

The hardest page, and the one most benchmarks skip.

You now have real numbers. The temptation is to rank things. Ranking requires deciding what
matters, and that decision is an opinion — so the only honest move is to state it in full.

## Say what a number is not

This site's latency figures come with, every time they are explained: _includes DNS, TLS,
network transit and provider queueing; measured from a GitHub runner in an undisclosed region;
**not** a measure of inference speed._

That is not modesty. It is the difference between a number a reader can use and a number that
will be screenshotted out of context.

## Publish your formulas

The quadrant axes here are arbitrary. So is the composite score. They are stated in full on the
methodology page — **rendered from the same constants the code uses**, so the page cannot describe
rules the code does not follow:

```ts
export const SCORE_DEFINITIONS = [{ name: 'Decisiveness', formula: '...', note: '...' }]
```

The same trick applies to classification: the yes/no synonym lists are exported from
`analyze.ts` and rendered on the methodology page. A reader who disagrees with an entry can see
exactly what they disagree with, which turns "your benchmark is wrong" into a pull request.

## Do not let your scores imply an answer you cannot support

Decisiveness here is **verdict-agnostic**: answering "Yes" three times and "No" three times score
identically. There is no correct answer to the hot dog question, and a score preferring one would
be a claim the research cannot support.

Your benchmark probably has an equivalent. Find it.

## Show failures

A provider that was down keeps its card in the report, with its error category and a note saying
why the entry was retained. Dropping unavailable providers biases the record toward whoever
happened to be up — invisibly, and more each year.

## Distinguish null from zero, all the way to the pixel

A metric that was not reported renders as an em dash **with a reason**: "not reported by this
provider", "no pricing on file". A screen-reader user hearing "dash" learns nothing; a sighted
user seeing "0" learns something false.

## Generate prose from the data

The executive summary and key findings are assembled at build time from the same numbers the
tables show, from templates with unit tests. They cannot contradict the data, and nobody has to
remember to rewrite them each week.

The tests assert something specific: that no shape of run — unanimous, split, single-model,
all-errors — produces "undefined" or "NaN" in published prose.

## State the limitations last and plainly

The methodology page ends with a section saying the questions are silly, there is no correct
answer, and nothing here measures model quality.

Put that section on your benchmark too. If you cannot write it, you do not understand your
benchmark well enough to publish it.

## Exercise

Read the methodology page's _Limitations of this research_ section, then write the equivalent
paragraph for a benchmark you would actually build.

If it comes out sounding defensive, you have found something to fix in the benchmark rather than
in the paragraph.

---

**That is the whole pipeline.** Fork it, replace `questions.json`, and you have a benchmark of
your own. [Self-hosting guide →](../self-hosting.md)
