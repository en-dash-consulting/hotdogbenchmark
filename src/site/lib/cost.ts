/**
 * What an edition cost, from the estimates recorded on every sample.
 *
 * Every question runs in every edition, and each one is models times
 * framings times samples calls a week. The maintainer decides how many
 * questions to carry with a number in front of them, so the editions page
 * shows each edition's total and the edition page shows the split.
 */
import type { BenchmarkRun } from '../../schema/run.ts'

/** The sum of every sample's estimate in one question's cells, across every framing. */
export function questionCost(run: BenchmarkRun, questionId: string): number | null {
  let total = 0
  let any = false
  for (const cell of run.results) {
    if (cell.questionId !== questionId) continue
    for (const model of cell.models) {
      for (const sample of model.samples) {
        if (sample.costEstimateUsd == null) continue
        total += sample.costEstimateUsd
        any = true
      }
    }
  }
  return any ? round6(total) : null
}

/** The whole edition. Null when no sample carried an estimate. */
export function runCost(run: BenchmarkRun): number | null {
  const parts = run.questions
    .map((question) => questionCost(run, question.id))
    .filter((cost): cost is number => cost !== null)
  return parts.length === 0 ? null : round6(parts.reduce((a, b) => a + b, 0))
}

/** Cents, as a reader says them: "$0.24", or "under a cent" below half a cent. */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null) return '—'
  if (usd < 0.005) return 'under a cent'
  return `$${usd.toFixed(2)}`
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
