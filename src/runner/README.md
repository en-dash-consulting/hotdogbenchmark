# `src/runner` — orchestration and analysis

The runner asks every enabled model every enabled question, several times, and turns the
answers into structured data.

| File           | Role                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `run.ts`       | `runBenchmark()` — the bounded-concurrency loop over question × model.                          |
| `analyze.ts`   | Turns a verbatim answer into a verdict (`yes` / `no` / `other`) and a one-word-compliance flag. |
| `aggregate.ts` | Medians, majority verdict, compliance rate across the samples for one model.                    |
| `cost.ts`      | Optional USD estimate from the pricing table in `models.json`.                                  |
| `health.ts`    | Which providers have failed in every one of the last three runs.                                |

Like `src/providers`, this directory is runtime-agnostic: no `fs`, no `process`, no `node:`
imports. Reading files and writing run output happens in `src/cli.ts` and `src/data/`.
