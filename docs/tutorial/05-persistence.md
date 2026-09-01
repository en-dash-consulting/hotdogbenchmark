# 5. Persist versioned data

**Implements:** [`src/schema/run.ts`](../../src/schema/run.ts),
[`src/data/paths.ts`](../../src/data/paths.ts), [`src/data/index.ts`](../../src/data/index.ts)

A benchmark's value is longitudinal. One week of data is a screenshot; two years is a record. So
the data format is the part you should design most carefully and change least often.

## Version the schema from the first commit

```ts
export const SCHEMA_VERSION = 1
```

Every run file records the version it was written under. This costs one integer now and is the
only thing that will let you render a two-year-old edition after the shape has moved on.

You will not do this retroactively. Do it on day one.

## Name files after the period, not the timestamp

`data/runs/2026-W36.json`, not `data/runs/1788298852.json`.

The consequence is that **re-running a week overwrites it**. That is the behaviour you want: when
a provider outage ruins Monday's run, you re-run on Tuesday and the edition is corrected rather
than duplicated. With timestamped filenames you get two files for one week and every downstream
consumer has to decide which is real.

ISO weeks in **UTC**, always. A run starting at 23:00 Sunday in one timezone and 01:00 Monday in
another must land in exactly one edition, and UTC is the only tiebreak that does not depend on
where the runner happens to be. The tests cover the year boundaries, where the ISO year and the
calendar year disagree — 2021-01-01 is `2020-W53`.

## Validate on write _and_ on read

The runner validates the run it built before writing it, treating a failure as a bug in the
runner. `npm run data:validate` re-validates every committed file, and the site build validates
again at build time.

Three checks of the same thing sounds excessive until a hand-edited file breaks a site build
three months later and the error names a line in a template rather than the file that is wrong.
Here, the error names the file and the JSON pointer.

## Generated files must be deterministic

`data/index.json` is generated and committed. It contains **no timestamp of its own**, and the
run list has a stable order.

That means regenerating it from unchanged inputs produces a byte-identical file, so a diff always
means something actually changed. A generated file with a `generatedAt` in it produces a diff on
every CI run, everyone learns to ignore those diffs, and then a real change slips through.

CI enforces it: the `data` job regenerates the manifest and fails if `git diff` is non-empty.

## Nullable means "not reported"

Said on page 2, repeated here because it is a persistence decision as much as a normalization
one. Once a null is written as a zero, the information is gone forever. `docs/data-schema.md`
documents, per field, why each nullable field may be null.

## Exercise

Open a committed run file and change one `outputTokens` to `-1`. Run `npm run data:validate`.

Read the error. It names the file and the exact JSON pointer. Now imagine that error arriving as
`TypeError: Cannot read properties of undefined` from inside a chart component, which is what you
get without schema validation.

**Next:** [6. Automate it →](06-automation.md)
