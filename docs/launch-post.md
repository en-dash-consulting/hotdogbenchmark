# Launch post (draft)

Not published. Edit before use — particularly the live link, which does not exist yet.

---

## Short version, for a link-sharing site

> **hotdogbenchmark** — every Monday, seven of the largest AI models are asked whether a hot dog
> is a sandwich, and the results are published as a completely straight-faced industry analyst
> report.
>
> It is a teaching project. The question is silly; the pipeline is not. Provider adapters, usage
> normalization, latency measurement, sampling, versioned data, scheduled collection, honest
> presentation — every unglamorous problem you hit building a real cross-provider benchmark,
> solved in the smallest honest way and documented.
>
> Fork it, change `questions.json`, and you have a benchmark.
>
> Live: <link> · Source: <link>

---

## Longer version, for a blog or a newsletter

### Every Monday I ask seven AI models whether a hot dog is a sandwich

There is a live site. It has an executive summary, a magic-quadrant-style scatter, vendor
scorecards with radar charts, week-over-week rank deltas, and a downloadable PDF edition. It
looks like it cost five figures. It is about whether a hot dog is a sandwich.

The joke is entirely in the words. Nothing in the design winks — no hot dog iconography, no
emoji, restrained navy-and-neutral palette, editorial serif over sans, tabular numerals
throughout. A reader shown a screenshot with the words blurred should not be able to tell it
apart from a real analyst publication.

**Everything under the joke is sincere**, and that is the actual point.

### Why build this

I wanted to write down how you build a cross-provider LLM benchmark, and the honest way to do
that is to build one. A benchmark that matters would have been the wrong vehicle: the moment you
care whether model A beats model B, every methodological decision becomes a place to put your
thumb, and you will not notice yourself choosing the convenient answer.

There is no correct answer to the hot dog question. That makes it impossible to accidentally
build a benchmark that flatters a model I like.

### What is genuinely hard about this, and what the repository does about it

**Token counts do not mean the same thing across vendors.** A live call to one model returned
647 prompt tokens, 1 completion token, and a billed total of 1,295. The difference is 647
reasoning tokens counted _outside_ the completion count. Deriving the total as input plus output
— the obvious implementation — would have understated that call by half. The schema stores the
vendor's own total because of it.

**Time to first token means the first _content_ token.** That same call took nearly ten seconds
to produce its first content token, for a two-letter answer, because the model reasoned first.
Counting the first reasoning chunk would have reported a near-zero interval for a model that had
said nothing yet. Technically defensible. Completely misleading.

**Null is not zero.** A model that reports no reasoning tokens is not a model that used zero of
them. Collapsing those makes non-reasoning models look efficient for free. The distinction
survives all the way to the rendered page, where null shows as an em dash _with a reason_.

**You have to be careful how you call things.** The runner never has more than one request in
flight per provider. Three simultaneous calls to one vendor invites a rate limit, and a retried
request then has a latency reflecting your own impatience — your benchmark is measuring itself.

**A provider being down is a result.** Failed models keep their entry in the report. Dropping
them biases the archive toward whoever happened to be up, invisibly, and more each year.

### The part most benchmarks skip

The methodology page states, plainly, that the latency figures are not inference speed, that the
quadrant axes are constructed measures rather than observations, that token counts are not
comparable across vendors, that cost figures are estimates from a dated table — and, at the end,
that the questions are silly, there is no correct answer, and nothing in the publication measures
model quality.

If you cannot write that section for your benchmark, you do not understand it well enough to
publish it.

### Try it without an API key

```sh
git clone <link> && cd hotdogbenchmark && npm install
npm run bench -- run --mock
npm run dev
```

Mock mode replays recorded responses. Everything downstream of the network call is real:
classification, aggregation, cost estimation, schema validation, the site build.

### If you want the serious version

`docs/tutorial/` is eight pages, each mapping a concept to the file that implements it and
ending with an exercise that involves breaking something and watching the right test fail.

Change `questions.json` and you have a benchmark of your own. The self-hosting guide takes you
from fork to a live site in about fifteen minutes, and running it costs cents a month.

---

## Notes before publishing

- [ ] Replace every `<link>` with the real URL.
- [ ] Confirm the live site shows a **real** run, not the sample data.
- [ ] Re-check the 647/1,295 token figures against the committed run being cited.
- [ ] Screenshot the hot dog report for the post; `npm run build` regenerates
      `docs/images/report-light.png`.
- [ ] Do not claim seven providers are verified until they are. As of this draft, one is.
