import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockAdapter } from '../../src/providers/mock.ts'
import { loadMockFixtures } from '../../src/cli/mock-fixtures.ts'
import { benchmarkRunSchema } from '../../src/schema/run.ts'
import { fakeContext } from '../helpers/fake-adapter.ts'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const fixtures = loadMockFixtures(ROOT)

const REQUEST = {
  modelId: 'any-model',
  prompt: 'Is a hot dog a sandwich? One word answer.',
  maxOutputTokens: 64,
}

describe('the recorded response fixtures', () => {
  it('exist for every provider in models.json', () => {
    const models = JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
      models: Array<{ provider: string; enabled: boolean }>
    }
    for (const model of models.models.filter((m) => m.enabled)) {
      expect(fixtures.has(model.provider), `no fixture for ${model.provider}`).toBe(true)
    }
  })

  it('cover every enabled question', () => {
    const questions = JSON.parse(readFileSync(join(ROOT, 'questions.json'), 'utf8')) as {
      questions: Array<{ id: string; enabled: boolean }>
    }
    const enabled = questions.questions.filter((q) => q.enabled).map((q) => q.id)
    for (const [provider, fixture] of fixtures) {
      const recorded = fixture.responses.map((r) => r.questionId)
      for (const id of enabled) {
        expect(recorded, `${provider} has no recorded answer for ${id}`).toContain(id)
      }
    }
  })

  it('declare whether they were captured live or authored', () => {
    for (const [provider, fixture] of fixtures) {
      expect(['live', 'authored'], `${provider} has an odd source`).toContain(fixture.source)
    }
    // xAI's was captured from a real call; the rest are honest about not being.
    expect(fixtures.get('xai')?.source).toBe('live')
  })

  it('contain no key-shaped strings', () => {
    const dir = join(ROOT, 'tests/fixtures/responses')
    for (const name of readdirSync(dir)) {
      const content = readFileSync(join(dir, name), 'utf8')
      expect(/sk-[A-Za-z0-9_-]{16,}/.test(content), name).toBe(false)
      expect(/xai-[A-Za-z0-9]{16,}/.test(content), name).toBe(false)
      expect(/AIza[A-Za-z0-9_-]{20,}/.test(content), name).toBe(false)
    }
  })
})

describe('createMockAdapter', () => {
  const adapter = () => createMockAdapter('anthropic', { fixtures, speed: 0 })

  it('replays the recorded answer for a question', async () => {
    const result = await adapter().complete(REQUEST, fakeContext())
    expect(result.text).toBe('No')
    expect(result.usage.inputTokens).toBeGreaterThan(0)
    expect(result.timing.totalMs).toBeGreaterThan(0)
  })

  it('matches the right recorded answer per question', async () => {
    const hamburger = await adapter().complete(
      { ...REQUEST, prompt: 'Is a hamburger a sandwich? One word answer.' },
      fakeContext(),
    )
    expect(hamburger.text).toBe('Yes')
  })

  it('marks the result as mock so nothing downstream can mistake it for real', async () => {
    const result = await adapter().complete(REQUEST, fakeContext())
    expect(result.raw).toMatchObject({ mock: true })
  })

  it('errors rather than inventing an answer for an unrecorded question', async () => {
    // Substituting a default would let a mock run report results for a
    // question nobody recorded, which is worse than failing.
    await expect(
      adapter().complete(
        { ...REQUEST, prompt: 'Is a calzone a sandwich? One word answer.' },
        fakeContext(),
      ),
    ).rejects.toMatchObject({ category: 'bad_response' })
  })

  it('errors for a provider with no fixture at all, naming the fix', async () => {
    const orphan = createMockAdapter('nonexistent', { fixtures, speed: 0 })
    await expect(orphan.complete(REQUEST, fakeContext())).rejects.toThrow(/bench:record/)
  })

  it('produces identical timings for the same seed', async () => {
    const first = await createMockAdapter('anthropic', { fixtures, seed: 7, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    const second = await createMockAdapter('anthropic', { fixtures, seed: 7, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    expect(first.timing).toEqual(second.timing)
  })

  it('produces different timings for different seeds', async () => {
    const a = await createMockAdapter('anthropic', { fixtures, seed: 1, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    const b = await createMockAdapter('anthropic', { fixtures, seed: 2, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    expect(a.timing.totalMs).not.toBe(b.timing.totalMs)
  })

  it('preserves the null-versus-zero distinction from the recording', async () => {
    // Mistral reports no reasoning tokens at all; OpenAI reports some.
    const mistral = await createMockAdapter('mistral', { fixtures, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    const openai = await createMockAdapter('openai', { fixtures, speed: 0 }).complete(
      REQUEST,
      fakeContext(),
    )
    expect(mistral.usage.reasoningTokens).toBeNull()
    expect(openai.usage.reasoningTokens).toBeGreaterThan(0)
  })
})

/**
 * The end-to-end promise mock mode makes: a fresh clone with no API keys can
 * run the whole pipeline. This runs the real CLI in a real temporary
 * repository with every provider variable stripped from the environment.
 */
describe('bench run --mock end to end, with no API keys', () => {
  let root: string

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  function setUp(): string {
    root = mkdtempSync(join(tmpdir(), 'hdb-mock-'))
    for (const entry of [
      'src',
      'tests/fixtures/responses',
      'questions.json',
      'models.json',
      'package.json',
    ]) {
      const target = join(root, entry)
      mkdirSync(join(target, '..'), { recursive: true })
      cpSync(join(ROOT, entry), target, { recursive: true })
    }
    mkdirSync(join(root, 'data/runs'), { recursive: true })
    // Symlinked rather than copied: the temporary repo needs to resolve zod,
    // and copying a node_modules tree per test would dominate the run time.
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
    return root
  }

  function runCli(cwd: string, args: string[]) {
    // Strip every provider key so the test proves what it claims to.
    const env: NodeJS.ProcessEnv = { ...process.env, BENCH_SEED: '1', CI: '1' }
    for (const key of Object.keys(env)) {
      if (/_API_KEY$/.test(key)) delete env[key]
    }
    return execFileSync('node', [join(cwd, 'src/cli.ts'), ...args], {
      cwd,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  it('writes a schema-valid run marked isMock with no keys set', () => {
    const cwd = setUp()
    const output = runCli(cwd, ['run', '--mock'])
    expect(output).toContain('Wrote data/runs/')

    const runs = readdirSync(join(cwd, 'data/runs'))
    expect(runs).toHaveLength(1)

    const run = JSON.parse(readFileSync(join(cwd, 'data/runs', runs[0]!), 'utf8'))
    const parsed = benchmarkRunSchema.safeParse(run)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(run.isMock).toBe(true)
    expect(run.questions).toHaveLength(3)
    expect(run.results[0].models.length).toBeGreaterThan(0)
  })

  it('regenerates the manifest as part of the run', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock'])
    const manifest = JSON.parse(readFileSync(join(cwd, 'data/index.json'), 'utf8'))
    expect(manifest.runs).toHaveLength(1)
    expect(manifest.runs[0].isMock).toBe(true)
  })

  it('overwrites the same week rather than accumulating files', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock'])
    runCli(cwd, ['run', '--mock'])
    expect(readdirSync(join(cwd, 'data/runs'))).toHaveLength(1)
    const manifest = JSON.parse(readFileSync(join(cwd, 'data/index.json'), 'utf8'))
    expect(manifest.runs).toHaveLength(1)
  })

  it('produces the same data twice when seeded', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock'])
    const first = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    runCli(cwd, ['run', '--mock'])
    const second = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    // runId and wall-clock timestamps legitimately differ between executions.
    for (const key of ['runId', 'startedAt', 'finishedAt']) {
      delete first[key]
      delete second[key]
    }
    expect(first).toEqual(second)
  })

  it('validates its own output', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock'])
    const output = runCli(cwd, ['data', 'validate'])
    expect(output).toContain('validate against the schema')
  })

  it('makes no adapter calls in dry-run mode', () => {
    const cwd = setUp()
    const output = runCli(cwd, ['run', '--mock', '--dry-run'])
    expect(output).toContain('no provider will be called')
    expect(output).toContain('Total calls:')
    expect(readdirSync(join(cwd, 'data/runs'))).toHaveLength(0)
  })

  it('respects --samples and --questions', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1', '--questions', 'hot-dog'])
    const run = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    expect(run.questions).toHaveLength(1)
    expect(run.results[0].models[0].samples).toHaveLength(1)
  })

  it('exits 2 on an unknown question id rather than silently running everything', () => {
    const cwd = setUp()
    expect(() => runCli(cwd, ['run', '--mock', '--questions', 'calzone'])).toThrow()
  })
})
