/**
 * Which providers are consistently broken, as opposed to having a bad day.
 *
 * The weekly workflow tolerates a provider failing — that is a result, and it
 * gets published. What it should not do is tolerate a provider failing *every*
 * week silently, because at that point the report is showing a permanent outage
 * that nobody has noticed, and the honest options are to fix the key or to
 * disable the model.
 *
 * Pure and runtime-agnostic; the CLI supplies the run files.
 */
import type { BenchmarkRun } from '../schema/run.ts'

/** How many consecutive failed editions before a provider is called degraded. */
export const DEGRADED_THRESHOLD = 3

export interface ProviderHealth {
  provider: string
  /** Consecutive most-recent editions in which this provider produced nothing. */
  consecutiveFailures: number
  /** Editions considered, newest first. */
  editions: string[]
  degraded: boolean
}

/**
 * Assess each provider over the most recent editions.
 *
 * `runs` must be newest first. A provider absent from an edition — because it
 * was added later, or its key was not configured — **breaks the streak rather
 * than extending it**. Not being asked is not the same as failing, and treating
 * it as failure would open an issue against a provider nobody ever configured.
 */
export function assessProviderHealth(
  runs: BenchmarkRun[],
  threshold = DEGRADED_THRESHOLD,
): ProviderHealth[] {
  const considered = runs.slice(0, threshold)
  if (considered.length < threshold) {
    // Fewer editions than the threshold: nothing can have failed `threshold`
    // times yet, so nothing is degraded. Reporting otherwise on a new fork's
    // first week would be noise.
    return []
  }

  const providers = new Set<string>()
  for (const run of considered) {
    for (const result of run.results) {
      for (const model of result.models) providers.add(model.provider)
    }
  }

  return [...providers].sort().map((provider) => {
    let consecutiveFailures = 0
    for (const run of considered) {
      const entries = run.results.flatMap((result) =>
        result.models.filter((model) => model.provider === provider),
      )
      // Absent entirely: streak ends, because it was not asked.
      if (entries.length === 0) break
      // Any success at all in this edition ends the streak.
      if (entries.some((entry) => entry.status !== 'error')) break
      consecutiveFailures += 1
    }

    return {
      provider,
      consecutiveFailures,
      editions: considered.map((run) => run.isoWeek),
      degraded: consecutiveFailures >= threshold,
    }
  })
}

/** Just the degraded provider ids, for the workflow to act on. */
export function degradedProviders(runs: BenchmarkRun[], threshold = DEGRADED_THRESHOLD): string[] {
  return assessProviderHealth(runs, threshold)
    .filter((health) => health.degraded)
    .map((health) => health.provider)
}
