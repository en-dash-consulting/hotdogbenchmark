# 6. Automate it

**Implements:** [`.github/workflows/benchmark.yml`](../../.github/workflows/benchmark.yml),
[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml),
[`src/runner/health.ts`](../../src/runner/health.ts)

A benchmark that requires you to remember to run it is a benchmark that produces four data points
and then stops.

## The whole operation is a cron and some secrets

`benchmark.yml` runs Monday 12:00 UTC, calls the providers with keys from repository secrets,
commits the new data file, and `deploy.yml` republishes the site. Nobody runs anything by hand.

Total cost: nothing for the compute, cents for the API calls.

## Details that are easy to get wrong

**Do not run at midnight UTC.** Several providers schedule rate-limit resets and maintenance
around the day boundary. A benchmark that runs during a maintenance window measures the
maintenance window.

**Do not cancel in-progress runs.** CI jobs are cheap to cancel; a half-finished benchmark run has
already spent real money. `cancel-in-progress: false` on the benchmark, `true` on the deploy.

**Trigger the deploy from the benchmark, not just from pushes.** Without `workflow_run`, new data
lands on `main`, nothing rebuilds, and the site silently shows last week's numbers. This is the
single most common way a setup like this half-works.

**Commit only when something changed.** A re-run with identical results should produce no commit,
which falls out of naming files by ISO week and keeping the manifest timestamp-free.

## Separate the workflow that has secrets from the one that does not

`ci.yml` runs on pull requests and **references no secrets at all**. Not "redacts them" —
references none. A workflow that was never given a key cannot leak one, regardless of what a
malicious pull request tries.

That is only possible because mock mode exists. CI exercises the entire pipeline from recorded
fixtures. If your benchmark cannot run without keys, your PR workflow either cannot test it or is
a credential-exfiltration surface.

## Notice when it quietly stops working

Two failure modes, two responses:

**Everything failed.** Systemic. The job fails and opens an issue.

**One provider has failed three weeks running.** Nobody noticed, because partial failures are
tolerated by design. `health.ts` detects it and opens a labeled issue.

That second check has a subtlety worth stealing: a provider **absent** from an edition breaks the
failure streak rather than extending it. A provider added two weeks ago did not "fail" the week
before it existed, and a fork's first two weeks open no issues at all.

> **GitHub disables scheduled workflows after 60 days of repository inactivity.** It emails you.
> Any commit re-enables it. This is why abandoned forks of projects like this have data that
> stops abruptly.

## Exercise

Read `.github/workflows/ci.yml` and confirm for yourself that no job references `secrets.`
anything. Then read `tests/workflows.test.ts`, which asserts exactly that by scanning the YAML —
so it stays true.

**Next:** [7. Present it honestly →](07-present-honestly.md)
