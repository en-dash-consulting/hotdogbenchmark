/**
 * Prints `degraded=<comma-separated provider ids>` for the workflow to read as
 * a step output. Empty when nothing is consistently failing.
 *
 * Run by .github/workflows/benchmark.yml after a successful run.
 */
import { degradedProviders } from '../src/runner/health.ts'
import { loadAllRuns } from '../src/data/index.ts'

const runs = loadAllRuns().map((file) => file.run)
const degraded = degradedProviders(runs)
console.log(`degraded=${degraded.join(',')}`)
