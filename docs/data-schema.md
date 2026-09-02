# The run data schema

Every file in `data/runs/` is one weekly edition of the benchmark. This document describes
what is in one, field by field. The authority is `src/schema/run.ts`; this page explains the
reasoning that does not fit in a type.

Run `npm run data:validate` to check every committed file against the schema.

## Versioning

Each run file records the `schemaVersion` it was written under. Run files are committed and
kept forever, so the archive will eventually hold files written by several generations of this
schema. Carrying the version is what lets the site render a two-year-old edition after the
shape has moved on.

`SCHEMA_VERSION` is bumped when a change would make an existing committed file stop validating —
making a field required, removing one, or narrowing a type. Adding an optional field is not
breaking and does not need a bump.

**Older files are never rewritten.** `parseBenchmarkRun()` reads the declared version, validates
the file against the rules of _that_ version, and migrates it in memory to the current shape
(`src/data/migrate.ts`). The site build and `data:validate` both go through it, so a version-1
edition renders today exactly as it did when published, and the committed archive stays
byte-identical.

### What changed between version 1 and version 2

Version 2 introduced **experimental conditions**: every question is asked under several named
framings rather than one. Concretely:

| Change                                             | Why                                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New top-level `conditions` array                   | Records the arms _as defined that week_, for the same reason `questions` is stored rather than read from today's registry.                                    |
| `QuestionResult` gains `conditionId`               | Each result is now one cell of the condition × question matrix.                                                                                               |
| `QuestionResult` gains `prompt` and `systemPrompt` | The exact strings sent, after template substitution. Stored rather than reconstructed so the archive records what was asked, not what current code would ask. |
| `schemaVersion` is a literal `2`                   | A file claiming a version this checkout does not know is refused with "update your checkout" rather than guessed at.                                          |

**Migration from 1 to 2** assigns every existing result to the `control` condition. That is not a
guess: a version-1 run asked each question plainly with no system prompt, which is precisely the
definition of the control arm. `prompt` is filled from the question text the run already carried
and `systemPrompt` is null. The migration is covered by tests over a frozen version-1 fixture,
[`tests/fixtures/runs/example-v1.json`](../tests/fixtures/runs/example-v1.json), which must never
be regenerated — its value is that it is exactly what a version-1 runner wrote.

## Why so many fields are nullable

Almost every nullable field in this schema means **"the provider did not tell us"**, which is
different from zero. A model that reports no `reasoningTokens` is not a model that used zero
reasoning tokens; it is a model whose API does not have that concept, or does not expose it.
Collapsing the two would silently make non-reasoning models look efficient.

The one nullable field that means something else is `costEstimateUsd`, which is null when _we_
lack pricing data, not when the provider withheld it.

## `BenchmarkRun` — the top level

| Field           | Type               | Unit     | Nullable | Notes                                                                                                                                                                                      |
| --------------- | ------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion` | integer            | —        | no       | Generation of this schema. Currently `2`. Version-1 files are migrated on read.                                                                                                            |
| `runId`         | string             | —        | no       | Unique per execution. Rendered on the report as its document reference number.                                                                                                             |
| `isoWeek`       | string             | —        | no       | UTC ISO week, e.g. `2026-W36`. Also the filename.                                                                                                                                          |
| `startedAt`     | string             | ISO 8601 | no       | When the run began.                                                                                                                                                                        |
| `finishedAt`    | string             | ISO 8601 | no       | When it ended. Validated to be at or after `startedAt`.                                                                                                                                    |
| `runnerVersion` | string             | —        | no       | `package.json` version of the runner that wrote the file.                                                                                                                                  |
| `gitSha`        | string             | —        | **yes**  | Commit the runner was built from. Null for local runs outside a git checkout, where the CLI has nothing to read.                                                                           |
| `isMock`        | boolean            | —        | no       | True when the run replayed fixtures instead of calling providers. The site labels these; publishing simulated data unlabelled would undermine the one thing this project is serious about. |
| `questions`     | `Question[]`       | —        | no       | The questions as asked _this week_, so rewording a question later is visible in the archive rather than retroactively applied.                                                             |
| `conditions`    | `RunCondition[]`   | —        | no       | The conditions run _this week_, control first. Same reasoning as `questions`.                                                                                                              |
| `results`       | `QuestionResult[]` | —        | no       | One entry per condition × question cell. Every `questionId` must appear in `questions` and every `conditionId` in `conditions`; no cell may appear twice.                                  |

## `Question`

| Field  | Type   | Nullable | Notes                                                                                                 |
| ------ | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `id`   | string | no       | Lowercase slug, e.g. `hot-dog`. Appears in URLs, so changing one breaks links and history continuity. |
| `text` | string | no       | The exact prompt sent, including the `One word answer.` suffix.                                       |

## `RunCondition`

A condition is a named variant of how a question is asked. The registry is `conditions.json`;
the run records each enabled condition as it stood that week.

| Field          | Type   | Nullable | Notes                                                                                                       |
| -------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `id`           | string | no       | Lowercase slug. The first entry is always `control`, the baseline every other arm is compared against.      |
| `label`        | string | no       | Short label for tables and legends.                                                                         |
| `description`  | string | no       | One sentence on what the arm changes. Rendered on the methodology page.                                     |
| `systemPrompt` | string | **yes**  | The system-prompt _template_, before `{subject}` substitution. Null for none. The control's is always null. |
| `promptPrefix` | string | **yes**  | Text placed before the question in the user message, or null.                                               |
| `promptSuffix` | string | **yes**  | Text placed after the question, or null.                                                                    |
| `temperature`  | number | **yes**  | Sampling temperature requested, or null to leave the vendor default. The control's is always null.          |

Templates may contain `{subject}`, replaced with the question's subject (`a hot dog`) and
capitalised when it opens the template — so one `asserted` arm says "A hot dog is a sandwich."
to the hot dog question and "A taco is a sandwich." to the taco question.

## `QuestionResult`

One cell of the condition × question matrix.

| Field          | Type            | Nullable | Notes                                                                                                    |
| -------------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `questionId`   | string          | no       | Must match a `Question.id` in the same run.                                                              |
| `conditionId`  | string          | no       | Must match a `RunCondition.id` in the same run.                                                          |
| `prompt`       | string          | no       | The user message actually sent, after prefix, suffix and `{subject}` substitution.                       |
| `systemPrompt` | string          | **yes**  | The system prompt actually sent, after substitution. Null when the arm has none (always, for `control`). |
| `models`       | `ModelResult[]` | no       | One entry per enabled model, including models that failed.                                               |

## `ModelResult`

| Field         | Type                         | Nullable | Notes                                                                 |
| ------------- | ---------------------------- | -------- | --------------------------------------------------------------------- |
| `provider`    | string                       | no       | Provider id, matching `models.json` and the adapter registry.         |
| `modelId`     | string                       | no       | The literal string sent to the API.                                   |
| `displayName` | string                       | no       | Human label for the report.                                           |
| `status`      | `ok` \| `partial` \| `error` | no       | `ok`: every sample succeeded. `partial`: some did. `error`: none did. |
| `samples`     | `Sample[]`                   | no       | Empty if and only if `status` is `error`.                             |
| `aggregate`   | `Aggregate`                  | no       | The samples reduced to what the report shows.                         |
| `error`       | `ProviderError`              | **yes**  | Null when nothing went wrong. Required when `status` is `error`.      |

**Failed models stay in the report.** A provider outage is a result. Dropping the model would
quietly bias the archive toward whichever vendors happened to be up.

## `Sample` — one model answering one question once

Several samples are taken per model per question because LLM output is not deterministic. One
sample tells you what happened once.

| Field                 | Type                     | Unit   | Nullable | Notes                                                                                                                                                            |
| --------------------- | ------------------------ | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`                | string                   | —      | no       | Exactly what the model said, unmodified. The report quotes this verbatim.                                                                                        |
| `verdict`             | `yes` \| `no` \| `other` | —      | no       | Classification of `text`. Rules in `src/runner/analyze.ts`, rendered on the methodology page.                                                                    |
| `followedInstruction` | boolean                  | —      | no       | True when the normalized answer is exactly one word. Measures instruction-following, not correctness.                                                            |
| `usage`               | `Usage`                  | tokens | no       | See below.                                                                                                                                                       |
| `timing`              | `Timing`                 | ms     | no       | See below.                                                                                                                                                       |
| `costEstimateUsd`     | number                   | USD    | **yes**  | Estimate to 6 decimals from `models.json` pricing. Null when that model has no pricing entry. Always an estimate from a dated table, never a figure from a bill. |
| `raw`                 | unknown                  | —      | optional | The vendor's raw usage object, kept so a normalization decision can be re-checked later.                                                                         |

## `Usage`

**These numbers are not comparable across providers.** Every vendor tokenizes differently and
they disagree about whether reasoning tokens are counted inside output tokens. Per-provider
mappings and inclusion semantics are in [`usage-normalization.md`](usage-normalization.md).

| Field               | Type        | Unit   | Nullable | Notes                                                                                                                                                                                      |
| ------------------- | ----------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inputTokens`       | integer ≥ 0 | tokens | no       | Prompt tokens as the vendor counted them.                                                                                                                                                  |
| `outputTokens`      | integer ≥ 0 | tokens | no       | Generated tokens as the vendor counted them.                                                                                                                                               |
| `totalTokens`       | integer ≥ 0 | tokens | no       | The vendor's own total where it reports one, otherwise input + output. Stored rather than always derived because some vendors' totals do not equal the sum of their parts.                 |
| `reasoningTokens`   | integer ≥ 0 | tokens | **yes**  | Null means the vendor does not report this, not that it was zero. Whether these are also inside `outputTokens` varies by vendor.                                                           |
| `cachedInputTokens` | integer ≥ 0 | tokens | **yes**  | Input tokens served from the vendor's prompt cache. Null means not reported. Relevant here because the same short prompt is sent repeatedly, so cache hits are common and change the cost. |

## `Timing`

Measured from a GitHub-hosted runner in an unspecified region. Latency here includes DNS, TLS,
network transit, and whatever queueing the provider was doing. It measures _the experience of
calling this API from a generic cloud host_, not the model's inference speed.

| Field       | Type       | Unit     | Nullable | Notes                                                                                                                                                                                                 |
| ----------- | ---------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startedAt` | string     | ISO 8601 | no       | When the request was issued.                                                                                                                                                                          |
| `ttfbMs`    | number ≥ 0 | ms       | **yes**  | Time to first token. Null for non-streaming adapters — there is no first token to observe before the whole response arrives. `models.json` records which providers those are via `supportsStreaming`. |
| `totalMs`   | number ≥ 0 | ms       | no       | Wall clock from request issued to response fully read. Fractional, because `performance.now()` is.                                                                                                    |

## `Aggregate`

Medians rather than means throughout. With three samples, one cold start or one retried request
would drag a mean somewhere misleading.

Every statistic is a `{ median, min, max }` object, or null when it cannot be computed.

| Field                     | Type                     | Unit     | Nullable | Notes                                                                                                                                                                           |
| ------------------------- | ------------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sampleCount`             | integer ≥ 0              | —        | no       | Successful samples. Zero for an errored model.                                                                                                                                  |
| `totalMs`                 | `Stat`                   | ms       | **yes**  | Null when there are no samples.                                                                                                                                                 |
| `ttfbMs`                  | `Stat`                   | ms       | **yes**  | Null when no sample reported a first-token time — i.e. the adapter does not stream. Samples that individually report null are excluded rather than treated as zero.             |
| `inputTokens`             | `Stat`                   | tokens   | **yes**  | Null when there are no samples.                                                                                                                                                 |
| `outputTokens`            | `Stat`                   | tokens   | **yes**  | Null when there are no samples.                                                                                                                                                 |
| `totalTokens`             | `Stat`                   | tokens   | **yes**  | Null when there are no samples.                                                                                                                                                 |
| `tokensPerSecond`         | `Stat`                   | tokens/s | **yes**  | `outputTokens / (totalMs / 1000)`. Null when it cannot be computed — no samples, or zero elapsed time.                                                                          |
| `verdict`                 | `yes` \| `no` \| `other` | —        | **yes**  | The verdict a majority of samples gave. Ties resolve to `other`, because a model that said yes twice and no twice has not given a consistent answer. Null for an errored model. |
| `followedInstructionRate` | number 0..1              | —        | **yes**  | Share of samples answering in exactly one word. Null for an errored model.                                                                                                      |
| `costEstimateUsd`         | number ≥ 0               | USD      | **yes**  | Summed across samples. Null when pricing is missing.                                                                                                                            |

## `ProviderError`

| Field            | Type    | Nullable | Notes                                                                                                                                 |
| ---------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `category`       | enum    | no       | One of `auth`, `rate_limit`, `timeout`, `server`, `bad_response`, `unknown`.                                                          |
| `message`        | string  | no       | Human-readable and safe to render. Never contains headers or key material.                                                            |
| `retryable`      | boolean | no       | Whether the runner considered another attempt worthwhile.                                                                             |
| `providerStatus` | integer | **yes**  | The HTTP status, when the failure came from an HTTP response. Null for network-level failures and timeouts, which never produced one. |

### Error categories

| Category       | Meaning                                          | Retried?                                   |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| `auth`         | Bad or missing credentials                       | No — retrying will not find a key          |
| `rate_limit`   | Rate limited (429)                               | Yes, with backoff, honouring `Retry-After` |
| `timeout`      | Exceeded the per-request timeout and was aborted | Yes                                        |
| `server`       | 5xx from the provider                            | Yes                                        |
| `bad_response` | A 2xx whose body could not be interpreted        | No — retrying gets the same body           |
| `unknown`      | Anything else, including network failures        | No                                         |

## An example

A minimal but complete run with three questions, four models, and one failing provider lives at
[`tests/fixtures/runs/example.json`](../tests/fixtures/runs/example.json). It is validated by
the test suite, so it cannot drift from the schema. Regenerate it with
`node scripts/make-example-fixture.mjs`.
