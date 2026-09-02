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

/** A model id as a filename fragment: `meta-llama/Llama-3.3-70B` → `meta-llama-llama-3-3-70b`. */
export function modelSlug(modelId: string): string {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Where a model's fixture lives.
 *
 * A provider's first fixture is named by provider alone (`anthropic.json`),
 * which is how every fixture was named while each provider contributed one
 * model. Further models get `provider--model-slug.json`. A model id can
 * contain a slash, which is not a filename, hence the slug.
 */
export function fixturePathFor(provider: string, modelId?: string): string {
  return modelId === undefined
    ? `${FIXTURE_DIR}/${provider}.json`
    : `${FIXTURE_DIR}/${provider}--${modelSlug(modelId)}.json`
}

/** The lookup key the mock adapter uses for one model. */
export function fixtureKey(provider: string, modelId: string): string {
  return `${provider}/${modelId}`
}

/**
 * Read every recorded fixture.
 *
 * Each fixture is keyed by `provider/modelId`. A fixture in the legacy
 * provider-named file is also keyed by provider alone, which is what a mock
 * adapter falls back to for a model with no recording of its own. A missing
 * directory yields an empty map.
 */
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
    if (parsed.modelId) fixtures.set(fixtureKey(parsed.provider, parsed.modelId), parsed)
    if (name === `${parsed.provider}.json`) fixtures.set(parsed.provider, parsed)
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
