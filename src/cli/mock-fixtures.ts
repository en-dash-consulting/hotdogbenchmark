/**
 * Loading mock fixtures from disk.
 *
 * The Node-only half of mock mode. `src/providers/mock.ts` holds the adapter
 * itself and stays runtime-agnostic; this file is what reads files and the
 * environment on its behalf.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { installMocks, type MockFixture } from '../providers/mock.ts'
import { REPO_ROOT } from '../data/registries.ts'

/** Where recorded responses live, relative to the repository root. */
export const FIXTURE_DIR = 'tests/fixtures/responses'

/**
 * A model id can contain a slash (`meta-llama/Llama-3.3-70B-Instruct-Turbo`),
 * which is not a filename. Fixtures are named by provider instead, which is
 * unique anyway since one provider contributes one model to a run.
 */
export function fixturePathFor(provider: string): string {
  return `${FIXTURE_DIR}/${provider}.json`
}

/** Read every recorded fixture. A missing directory yields an empty map. */
export function loadMockFixtures(root: string = REPO_ROOT): Map<string, MockFixture> {
  const fixtures = new Map<string, MockFixture>()
  const dir = join(root, FIXTURE_DIR)

  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return fixtures
  }

  for (const name of names.filter((n) => n.endsWith('.json'))) {
    const path = join(dir, name)
    let parsed: MockFixture
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8')) as MockFixture
    } catch (cause) {
      throw new Error(`${FIXTURE_DIR}/${name} is not valid JSON`, { cause })
    }
    if (!parsed.provider || !Array.isArray(parsed.responses)) {
      throw new Error(
        `${FIXTURE_DIR}/${name} is missing "provider" or "responses"; see docs/data-schema.md`,
      )
    }
    fixtures.set(parsed.provider, parsed)
  }

  return fixtures
}

/**
 * Replace every registered adapter with its mock.
 *
 * `BENCH_SEED` is read here rather than inside the adapter, so the adapter
 * itself stays free of environment access.
 */
export function installMockAdapters(root: string = REPO_ROOT, speed = 1): () => void {
  const seedRaw = process.env.BENCH_SEED
  const seed = seedRaw === undefined ? undefined : Number(seedRaw)
  if (seedRaw !== undefined && !Number.isFinite(seed)) {
    throw new Error(`BENCH_SEED must be a number, got "${seedRaw}"`)
  }
  return installMocks({ fixtures: loadMockFixtures(root), seed, speed })
}
