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
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockAdapter } from '../../src/providers/mock.ts'
import { fixtureKey, loadMockFixtures, modelSlug } from '../../src/cli/mock-fixtures.ts'
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
  it('exist for every enabled model in models.json, each under its own key', () => {
    const models = JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
      models: Array<{ provider: string; modelId: string; enabled: boolean }>
    }
    for (const model of models.models.filter((m) => m.enabled)) {
      const key = fixtureKey(model.provider, model.modelId)
      expect(fixtures.has(key), `no fixture for ${key}`).toBe(true)
      expect(fixtures.get(key)?.modelId).toBe(model.modelId)
    }
  })

  it('serve a model-specific recording ahead of the provider fallback', async () => {
    // Two Anthropic models, two recordings; the mock must not hand Haiku
    // Opus's answers.
    const mock = createMockAdapter('anthropic', { fixtures, speed: 0 })
    const opus = await mock.complete({ ...REQUEST, modelId: 'claude-opus-5' }, fakeContext())
    const haiku = await mock.complete(
      { ...REQUEST, modelId: 'claude-haiku-4-5-20251001' },
      fakeContext(),
    )
    expect(opus.text).toBe(recordedFor('anthropic', 'claude-opus-5', 'hot-dog').text)
    expect(haiku.text).toBe(recordedFor('anthropic', 'claude-haiku-4-5-20251001', 'hot-dog').text)
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

/** The control recording for one model and question, straight from the fixture file. */
const recordedFor = (provider: string, modelId: string, questionId: string) =>
  fixtures
    .get(fixtureKey(provider, modelId))!
    .responses.find((r) => r.questionId === questionId && (r.systemPrompt ?? null) === null)!

describe('modelSlug', () => {
  it('turns a model id with slashes and dots into a filename fragment', () => {
    expect(modelSlug('meta-llama/Llama-3.3-70B-Instruct-Turbo')).toBe(
      'meta-llama-llama-3-3-70b-instruct-turbo',
    )
    expect(modelSlug('gpt-5.4-mini')).toBe('gpt-5-4-mini')
  })
})

describe('createMockAdapter', () => {
  const adapter = () => createMockAdapter('anthropic', { fixtures, speed: 0 })

  /** The control recording for a question, straight from the fixture file. */
  const recorded = (provider: string, questionId: string) =>
    fixtures
      .get(provider)!
      .responses.find((r) => r.questionId === questionId && (r.systemPrompt ?? null) === null)!

  it('replays the recorded answer for a question', async () => {
    const result = await adapter().complete(REQUEST, fakeContext())
    expect(result.text).toBe(recorded('anthropic', 'hot-dog').text)
    expect(result.text).toMatch(/^No\b/)
    expect(result.usage.inputTokens).toBeGreaterThan(0)
    expect(result.timing.totalMs).toBeGreaterThan(0)
  })

  it('matches the right recorded answer per question', async () => {
    const hamburger = await adapter().complete(
      { ...REQUEST, prompt: 'Is a hamburger a sandwich? One word answer.' },
      fakeContext(),
    )
    expect(hamburger.text).toBe(recorded('anthropic', 'hamburger').text)
    expect(hamburger.text).toMatch(/^Yes\b/)
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

  it('replays a recording made under the same system prompt when there is one', async () => {
    const custom = new Map(fixtures)
    custom.set('anthropic', {
      provider: 'anthropic',
      modelId: 'm',
      source: 'live',
      recordedAt: '2026-09-01',
      responses: [
        { ...fixtures.get('anthropic')!.responses[0]!, systemPrompt: null, text: 'No' },
        {
          ...fixtures.get('anthropic')!.responses[0]!,
          conditionId: 'asserted',
          systemPrompt: 'A hot dog is a sandwich.',
          text: 'Yes',
        },
      ],
    })
    const mock = createMockAdapter('anthropic', { fixtures: custom, speed: 0 })

    const control = await mock.complete(REQUEST, fakeContext())
    expect(control.text).toBe('No')
    expect(control.raw).not.toHaveProperty('replayedFrom')

    const asserted = await mock.complete(
      { ...REQUEST, systemPrompt: 'A hot dog is a sandwich.' },
      fakeContext(),
    )
    expect(asserted.text).toBe('Yes')
    expect(asserted.raw).not.toHaveProperty('replayedFrom')
  })

  it('falls back to the control recording for an unrecorded system prompt, and says so', async () => {
    // A fixture captured before conditions existed still runs under every
    // arm; it just cannot show sensitivity, and the result admits that.
    const result = await adapter().complete(
      { ...REQUEST, systemPrompt: 'Nobody recorded this system prompt.' },
      fakeContext(),
    )
    expect(result.text).toBe(recorded('anthropic', 'hot-dog').text)
    expect(result.raw).toMatchObject({ mock: true, replayedFrom: 'control' })
  })

  it('replays real recorded sensitivity for a provider whose fixture has every arm', async () => {
    // Mistral's live capture adopted both framings; the mock must show that
    // rather than the control answer three times.
    const mistral = createMockAdapter('mistral', { fixtures, speed: 0 })
    const control = await mistral.complete(REQUEST, fakeContext())
    const asserted = await mistral.complete(
      { ...REQUEST, systemPrompt: 'A hot dog is a sandwich.' },
      fakeContext(),
    )
    expect(control.text).toMatch(/^No\b/)
    expect(asserted.text).toMatch(/^Yes\b/)
    expect(asserted.raw).not.toHaveProperty('replayedFrom')
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
      'conditions.json',
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

  function runCli(cwd: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
    // Strip every provider key so the test proves what it claims to, and any
    // cadence the developer's shell happens to set, so the default is tested.
    const env: NodeJS.ProcessEnv = { ...process.env, BENCH_SEED: '1', CI: '1' }
    for (const key of Object.keys(env)) {
      if (/_API_KEY$/.test(key) || key === 'BENCH_CADENCE') delete env[key]
    }
    Object.assign(env, extraEnv)
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

  it('replaces the same week as the edition, but keeps the previous run under superseded/', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock'])
    const first = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    const output = runCli(cwd, ['run', '--mock'])
    expect(output).toContain('Kept the previous run as data/runs/superseded/')

    const entries = readdirSync(join(cwd, 'data/runs'))
    expect(entries.filter((name) => name.endsWith('.json'))).toHaveLength(1)
    expect(readdirSync(join(cwd, 'data/runs/superseded'))).toEqual([
      `${first.isoWeek}-${first.runId}.json`,
    ])
    // The site sees one edition; the manifest agrees.
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

  it('runs every enabled condition by default and tags each cell', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1'])
    const run = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    const conditions = JSON.parse(readFileSync(join(ROOT, 'conditions.json'), 'utf8')) as {
      conditions: Array<{ id: string; enabled: boolean }>
    }
    const enabled = conditions.conditions.filter((c) => c.enabled).map((c) => c.id)
    expect(run.conditions.map((c: { id: string }) => c.id)).toEqual(enabled)
    expect(run.results).toHaveLength(enabled.length * 3)
    const asserted = run.results.find(
      (r: { conditionId: string; questionId: string }) =>
        r.conditionId === 'asserted' && r.questionId === 'taco',
    )
    expect(asserted.systemPrompt).toBe('A taco is a sandwich.')
  })

  it('restricts the run with --conditions while always keeping the control', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1', '--conditions', 'asserted'])
    const run = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    expect(run.conditions.map((c: { id: string }) => c.id)).toEqual(['control', 'asserted'])
  })

  it('lets a fork run the control alone', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1', '--conditions', 'control'])
    const run = JSON.parse(
      readFileSync(join(cwd, 'data/runs', readdirSync(join(cwd, 'data/runs'))[0]!), 'utf8'),
    )
    expect(run.conditions.map((c: { id: string }) => c.id)).toEqual(['control'])
    expect(run.results).toHaveLength(3)
  })

  it('prints the full matrix and the total call count in dry-run mode', () => {
    const cwd = setUp()
    const output = runCli(cwd, ['run', '--mock', '--dry-run', '--samples', '2'])
    expect(output).toContain('Conditions:   3')
    expect(output).toContain('"A hot dog is a sandwich."')
    const enabledModels = (
      JSON.parse(readFileSync(join(ROOT, 'models.json'), 'utf8')) as {
        models: Array<{ enabled: boolean }>
      }
    ).models.filter((m) => m.enabled).length
    expect(output).toContain(
      `Matrix:       3 conditions x 3 questions x ${enabledModels} models x 2 samples`,
    )
    expect(output).toContain(`Total calls:  ${3 * 3 * enabledModels * 2}`)
  })

  it('refuses to overwrite a real edition with mock data, unless --out says where', () => {
    const cwd = setUp()
    // Plant a real-looking edition for the current week.
    runCli(cwd, ['run', '--mock', '--samples', '1'])
    const [name] = readdirSync(join(cwd, 'data/runs'))
    const path = join(cwd, 'data/runs', name!)
    const real = JSON.parse(readFileSync(path, 'utf8'))
    real.isMock = false
    const planted = JSON.stringify(real, null, 2) + '\n'
    writeFileSync(path, planted)

    expect(() => runCli(cwd, ['run', '--mock', '--samples', '1'])).toThrow(
      /will not overwrite real data/,
    )
    expect(readFileSync(path, 'utf8')).toBe(planted)

    // The escape hatch writes somewhere else and leaves the edition alone.
    runCli(cwd, ['run', '--mock', '--samples', '1', '--out', 'tmp/mock-run.json'])
    expect(readFileSync(path, 'utf8')).toBe(planted)
    expect(JSON.parse(readFileSync(join(cwd, 'tmp/mock-run.json'), 'utf8')).isMock).toBe(true)
  })

  it('exits 2 on an unknown condition id', () => {
    const cwd = setUp()
    expect(() => runCli(cwd, ['run', '--mock', '--conditions', 'shouted'])).toThrow()
  })

  it('writes a daily edition keyed by UTC date with --cadence day', () => {
    const cwd = setUp()
    const output = runCli(cwd, ['run', '--mock', '--samples', '1', '--cadence', 'day'])
    const [name] = readdirSync(join(cwd, 'data/runs'))
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}\.json$/)
    expect(output).toContain(`Wrote data/runs/${name}`)

    const run = JSON.parse(readFileSync(join(cwd, 'data/runs', name!), 'utf8'))
    const parsed = benchmarkRunSchema.safeParse(run)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(run.editionKey).toBe(name!.replace(/\.json$/, ''))
    // The week is still recorded, so a daily archive can be read by week later.
    expect(run.isoWeek).toMatch(/^\d{4}-W\d{2}$/)

    const manifest = JSON.parse(readFileSync(join(cwd, 'data/index.json'), 'utf8'))
    expect(manifest.runs).toHaveLength(1)
    expect(manifest.runs[0]).toMatchObject({
      editionKey: run.editionKey,
      isoWeek: run.isoWeek,
      path: `data/runs/${name}`,
    })
    expect(runCli(cwd, ['data', 'validate'])).toContain('validate against the schema')
  })

  it('stamps a weekly edition with an explicit editionKey equal to its week', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1'])
    const [name] = readdirSync(join(cwd, 'data/runs'))
    const run = JSON.parse(readFileSync(join(cwd, 'data/runs', name!), 'utf8'))
    expect(run.editionKey).toBe(run.isoWeek)
    expect(name).toBe(`${run.editionKey}.json`)
  })

  it('reads the cadence from BENCH_CADENCE when no flag is given', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1'], { BENCH_CADENCE: 'day' })
    const [name] = readdirSync(join(cwd, 'data/runs'))
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('supersedes a daily edition under its date, leaving the same week untouched', () => {
    const cwd = setUp()
    runCli(cwd, ['run', '--mock', '--samples', '1'])
    runCli(cwd, ['run', '--mock', '--samples', '1', '--cadence', 'day'])
    const daily = readdirSync(join(cwd, 'data/runs')).find((n) =>
      /^\d{4}-\d{2}-\d{2}\.json$/.test(n),
    )!
    const first = JSON.parse(readFileSync(join(cwd, 'data/runs', daily), 'utf8'))

    const output = runCli(cwd, ['run', '--mock', '--samples', '1', '--cadence', 'day'])
    expect(output).toContain(
      `Kept the previous run as data/runs/superseded/${first.editionKey}-${first.runId}.json`,
    )
    expect(readdirSync(join(cwd, 'data/runs/superseded'))).toEqual([
      `${first.editionKey}-${first.runId}.json`,
    ])
    // Both editions remain: the week and the day are different files.
    const editions = readdirSync(join(cwd, 'data/runs')).filter((n) => n.endsWith('.json'))
    expect(editions).toHaveLength(2)
    const manifest = JSON.parse(readFileSync(join(cwd, 'data/index.json'), 'utf8'))
    const keys = manifest.runs.map((entry: { editionKey: string }) => entry.editionKey)
    // Order is not asserted: on a Monday the day and its week tie on start
    // time, and the tiebreak is covered by the paths unit tests.
    expect(keys).toHaveLength(2)
    expect(keys).toContain(first.editionKey)
    expect(keys).toContain(first.isoWeek)
  })

  it('names the cadence in the dry-run plan without writing anything', () => {
    const cwd = setUp()
    const output = runCli(cwd, ['run', '--mock', '--dry-run', '--cadence', 'day'])
    expect(output).toContain('Cadence:      daily editions')
    expect(output).toMatch(/Output:\s+data\/runs\/\d{4}-\d{2}-\d{2}\.json/)
    expect(readdirSync(join(cwd, 'data/runs'))).toHaveLength(0)
  })

  it('exits 2 on a cadence it does not know rather than quietly running weekly', () => {
    const cwd = setUp()
    expect(() => runCli(cwd, ['run', '--mock', '--cadence', 'hourly'])).toThrow(/Unknown cadence/)
    expect(() => runCli(cwd, ['run', '--mock'], { BENCH_CADENCE: 'monthly' })).toThrow(
      /Unknown cadence/,
    )
    expect(readdirSync(join(cwd, 'data/runs'))).toHaveLength(0)
  })

  it('exits 2 on an unknown question id rather than silently running everything', () => {
    const cwd = setUp()
    expect(() => runCli(cwd, ['run', '--mock', '--questions', 'calzone'])).toThrow()
  })
})
