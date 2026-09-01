# 0. Decide what you are measuring

> **The exercise at the end of every page is the point.** Reading this teaches you what the code
> does; doing the exercise teaches you why it is shaped that way.

## Start with a question you do not care about

This benchmark asks whether a hot dog is a sandwich. That is a deliberate choice, and not only
because it is funny.

A first benchmark should have a question where **you have no stake in the answer**. The moment
you care whether model A beats model B, every methodological decision becomes a place to put your
thumb. Which samples to take, how to classify a hedge, whether to include a provider that was
down — each has a defensible answer and a convenient one, and you will not notice yourself
choosing the convenient one.

There is no correct answer to the hot dog question. That makes it impossible to accidentally
build a benchmark that flatters a model you like.

## What "measuring" means here

Almost nothing in this repository measures whether an answer is _good_. It measures:

- **What the model said**, verbatim.
- **Whether it followed the instruction** — the question asks for one word.
- **How long it took**, split into time-to-first-token and total.
- **What it cost**, in tokens and in estimated dollars.
- **Whether it answered at all.**

Those are all things you can measure without a ground truth, and they are most of what you
actually want to know when choosing between models for a real task.

Notice that "did it get it right" is absent. Adding it means building a grader, and a grader is
a whole second benchmark with its own biases. Start without one.

## Two things worth deciding before writing code

**Where do the questions live?** In this repository, `questions.json`. Not in code. Adding a
question is a data change, which means someone who does not write TypeScript can propose one.

**Where do the model IDs live?** In `models.json`, and nowhere else. No adapter hardcodes a model
ID. This sounds fussy until the third time a vendor renames a model.

Both files are validated by a schema — [`src/schema/questions.ts`](../../src/schema/questions.ts)
and [`src/schema/models.ts`](../../src/schema/models.ts) — so a malformed entry fails immediately
rather than at 12:00 UTC on a Monday.

## Run it

```sh
npm run bench -- run --mock
```

That asks every model every question three times from recorded fixtures, classifies the answers,
computes aggregates and costs, validates the output against the schema, and writes a run file.
No keys, no network.

## Exercise

Open `questions.json` and add a fourth question — `"grilled-cheese"` is the traditional next
argument. Run mock mode again.

It will fail, and the error message will tell you exactly why. Read it. That failure is the
schema doing its job: mock mode has no recorded answer for a question nobody recorded, and it
refuses to invent one rather than quietly producing a result for a question that was never asked.

Now set `"enabled": false` on it and run again.

**Next:** [1. Write one adapter →](01-one-adapter.md)
