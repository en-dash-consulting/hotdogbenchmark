/**
 * Runs that were replaced within their own edition.
 *
 * `bench run` moves a week's previous file to `data/runs/superseded/` rather
 * than deleting it. The site never shows those as editions, but the history
 * page can compare them run over run: the same week, asked more than once,
 * is the closest thing to a controlled repeat the archive has.
 *
 * Build time only, like `data.ts`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from '../../data/registries.ts'
import { parseBenchmarkRun, type BenchmarkRun } from '../../schema/run.ts'

const SUPERSEDED_DIR = 'data/runs/superseded'

/** Every superseded run, oldest first, migrated to the current schema. */
export function loadSupersededRuns(root: string = REPO_ROOT): BenchmarkRun[] {
  const dir = join(root, SUPERSEDED_DIR)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const path = `${SUPERSEDED_DIR}/${name}`
      return parseBenchmarkRun(JSON.parse(readFileSync(join(root, path), 'utf8')), path)
    })
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
}

/**
 * The sequence of runs for one edition, oldest first: every superseded run
 * for that week, then the published one.
 */
export function runsWithinEdition(
  published: BenchmarkRun,
  superseded: BenchmarkRun[],
): BenchmarkRun[] {
  return [...superseded.filter((run) => run.isoWeek === published.isoWeek), published]
}
