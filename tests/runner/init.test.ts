import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
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
import { defaultTitleFor, slugForSubject, withOneWordSuffix } from '../../src/cli/init.ts'
import { ONE_WORD_SUFFIX } from '../../src/schema/questions.ts'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

describe('slugForSubject', () => {
  it('drops the leading article and slugs the rest', () => {
    expect(slugForSubject('a burrito')).toBe('burrito')
    expect(slugForSubject('a hot dog')).toBe('hot-dog')
    expect(slugForSubject('an egg roll')).toBe('egg-roll')
    expect(slugForSubject('the Pop-Tart')).toBe('pop-tart')
  })

  it('leaves a subject with no article alone', () => {
    expect(slugForSubject('sushi')).toBe('sushi')
    expect(slugForSubject('  Chicago deep dish  ')).toBe('chicago-deep-dish')
  })
})

describe('defaultTitleFor', () => {
  it('title-cases the subject without its article', () => {
    expect(defaultTitleFor('a burrito')).toBe('The Burrito Question')
    expect(defaultTitleFor('a hot dog')).toBe('The Hot Dog Question')
    expect(defaultTitleFor('the Pop-Tart')).toBe('The Pop-Tart Question')
  })
})

describe('withOneWordSuffix', () => {
  it('appends the closing instruction when it is missing', () => {
    expect(withOneWordSuffix('Is a burrito a sandwich?')).toBe(
      `Is a burrito a sandwich? ${ONE_WORD_SUFFIX}`,
    )
  })

  it('leaves a question that already has it untouched', () => {
    const text = `Is a burrito a sandwich? ${ONE_WORD_SUFFIX}`
    expect(withOneWordSuffix(text)).toBe(text)
    expect(withOneWordSuffix(`  ${text}\n`)).toBe(text)
  })
})

/**
 * The real CLI in a real temporary repository, the same way the mock-mode
 * tests do it: a copy of the registries, fixtures and source, with
 * node_modules symlinked so zod resolves.
 */
describe('bench init end to end', () => {
  let root: string

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  function setUp(): string {
    root = mkdtempSync(join(tmpdir(), 'hdb-init-'))
    for (const entry of [
      'src',
      'tests/fixtures/responses',
      'questions.json',
      'models.json',
      'conditions.json',
      'site.json',
      'package.json',
    ]) {
      const target = join(root, entry)
      mkdirSync(join(target, '..'), { recursive: true })
      cpSync(join(ROOT, entry), target, { recursive: true })
    }
    mkdirSync(join(root, 'data/runs'), { recursive: true })
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
    return root
  }

  function runCli(cwd: string, args: string[]) {
    // No provider key may leak in: init must never need one, and the mock run
    // used to plant editions must not make a live call by accident.
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

  /**
   * Plant one mock edition and one real-looking edition. The mock run is
   * produced by the CLI itself while the old fixtures are still present, so
   * both files are schema-valid and the manifest can be rebuilt around them.
   */
  function plantRuns(cwd: string): { mock: string; real: string } {
    runCli(cwd, ['run', '--mock', '--samples', '1', '--questions', 'hot-dog'])
    const [name] = readdirSync(join(cwd, 'data/runs'))
    const mock = join(cwd, 'data/runs', name!)
    const edition = JSON.parse(readFileSync(mock, 'utf8'))
    edition.isMock = false
    edition.isoWeek = '2025-W11'
    edition.runId = '00000000-0000-4000-8000-000000000000'
    const real = join(cwd, 'data/runs/2025-W11.json')
    writeFileSync(real, JSON.stringify(edition, null, 2) + '\n')
    return { mock, real }
  }

  const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

  const BURRITO = ['--question', 'Is a burrito a sandwich?', '--subject', 'a burrito']

  it('rewrites both registries, empties the fixtures, and drops mock editions only', () => {
    const cwd = setUp()
    const { mock, real } = plantRuns(cwd)
    expect(readdirSync(join(cwd, 'tests/fixtures/responses')).length).toBeGreaterThan(0)

    const output = runCli(cwd, ['init', ...BURRITO, '--yes'])

    const questions = readJson(join(cwd, 'questions.json'))
    expect(questions.questions).toHaveLength(1)
    expect(questions.questions[0]).toMatchObject({
      id: 'burrito',
      subject: 'a burrito',
      text: `Is a burrito a sandwich? ${ONE_WORD_SUFFIX}`,
      reportTitle: 'The Burrito Question',
      enabled: true,
    })
    expect(output).toContain(`Appended "${ONE_WORD_SUFFIX}" to: burrito`)

    // The framings stay templates: the runner fills {subject} per question.
    const conditions = readJson(join(cwd, 'conditions.json'))
    expect(conditions.conditions.map((c: { id: string }) => c.id)).toEqual([
      'control',
      'asserted',
      'denied',
    ])
    expect(conditions.conditions[0].systemPrompt).toBeNull()
    expect(conditions.conditions[1].systemPrompt).toBe('{subject} is a sandwich.')
    expect(conditions.conditions[2].systemPrompt).toBe('{subject} is not a sandwich.')
    expect(conditions.conditions[1].description).toContain('"A burrito is a sandwich."')

    expect(readdirSync(join(cwd, 'tests/fixtures/responses'))).toEqual([])
    expect(existsSync(mock)).toBe(false)
    expect(existsSync(real)).toBe(true)
    expect(output).toContain('Real editions kept')
    expect(output).toContain('data/runs/2025-W11.json')

    // The manifest describes what is left, and the next steps are spelled out.
    const manifest = readJson(join(cwd, 'data/index.json'))
    expect(manifest.runs).toHaveLength(1)
    expect(manifest.runs[0].isMock).toBe(false)
    expect(output).toContain('npm run bench:record -- --provider anthropic')
    expect(output).toContain('npm run bench -- run --mock --out tmp/mock-run.json')
    expect(output).toContain('npm run dev')
  })

  it('writes a site.json named after the question, not after the upstream', () => {
    const cwd = setUp()
    runCli(cwd, [
      'init',
      ...BURRITO,
      '--repository',
      'https://github.com/someone/burritos',
      '--yes',
    ])
    const site = readJson(join(cwd, 'site.json'))
    expect(site.name).toBe('Burrito Benchmark')
    expect(site.repository).toBe('https://github.com/someone/burritos')
    expect(site.byline).not.toMatch(/En Dash/)
    expect(site.contact).toBeNull()
    expect(JSON.stringify(site)).not.toMatch(/hotdog|endash/i)
  })

  it('takes the site name, byline and publisher from flags', () => {
    const cwd = setUp()
    runCli(cwd, [
      'init',
      ...BURRITO,
      '--site-name',
      'The Wrap Report',
      '--byline',
      'a Taqueria Labs publication',
      '--publisher',
      'Taqueria Labs',
      '--publisher-url',
      'https://taqueria.example',
      '--repository',
      'https://github.com/taqueria/wraps',
      '--yes',
    ])
    const site = readJson(join(cwd, 'site.json'))
    expect(site.name).toBe('The Wrap Report')
    expect(site.wordmark).toEqual(['The Wrap', 'Report'])
    expect(site.publisher).toEqual({ name: 'Taqueria Labs', url: 'https://taqueria.example' })
    expect(site.byline).toBe('a Taqueria Labs publication')
  })

  it('removes real editions only with --force', () => {
    const cwd = setUp()
    const { real } = plantRuns(cwd)

    runCli(cwd, ['init', ...BURRITO, '--yes', '--force'])

    expect(existsSync(real)).toBe(false)
    expect(readdirSync(join(cwd, 'data/runs')).filter((n) => n.endsWith('.json'))).toEqual([])
    expect(readJson(join(cwd, 'data/index.json')).runs).toEqual([])
  })

  it('writes nothing in dry-run mode', () => {
    const cwd = setUp()
    const { mock, real } = plantRuns(cwd)
    const before = {
      questions: readFileSync(join(cwd, 'questions.json'), 'utf8'),
      conditions: readFileSync(join(cwd, 'conditions.json'), 'utf8'),
      fixtures: readdirSync(join(cwd, 'tests/fixtures/responses')),
    }

    const output = runCli(cwd, ['init', ...BURRITO, '--dry-run', '--force'])

    expect(output).toContain('Dry run: nothing written.')
    expect(output).toContain('data/runs/2025-W11.json (real, --force)')
    expect(readFileSync(join(cwd, 'questions.json'), 'utf8')).toBe(before.questions)
    expect(readFileSync(join(cwd, 'conditions.json'), 'utf8')).toBe(before.conditions)
    expect(readdirSync(join(cwd, 'tests/fixtures/responses'))).toEqual(before.fixtures)
    expect(existsSync(mock)).toBe(true)
    expect(existsSync(real)).toBe(true)
  })

  it('leaves only the control with --no-framings', () => {
    const cwd = setUp()
    runCli(cwd, ['init', ...BURRITO, '--yes', '--no-framings'])
    const conditions = readJson(join(cwd, 'conditions.json'))
    expect(conditions.conditions.map((c: { id: string }) => c.id)).toEqual(['control'])
  })

  it('takes several questions with per-position ids, titles, and templates', () => {
    const cwd = setUp()
    runCli(cwd, [
      'init',
      '--question',
      'Is a burrito a sandwich?',
      '--subject',
      'a burrito',
      '--question',
      `Is a calzone a sandwich? ${ONE_WORD_SUFFIX}`,
      '--subject',
      'a calzone',
      '--id',
      'wrap',
      '--title',
      'The Wrap Problem',
      '--tagline',
      'Folded, not stacked.',
      '--assert',
      '{subject} counts as a sandwich.',
      '--deny',
      '{subject} does not count as a sandwich.',
      '--yes',
    ])
    const questions = readJson(join(cwd, 'questions.json'))
    expect(questions.questions.map((q: { id: string }) => q.id)).toEqual(['wrap', 'calzone'])
    expect(questions.questions[0]).toMatchObject({
      reportTitle: 'The Wrap Problem',
      tagline: 'Folded, not stacked.',
    })
    expect(questions.questions[1].reportTitle).toBe('The Calzone Question')
    expect(questions.questions[1]).not.toHaveProperty('tagline')

    const conditions = readJson(join(cwd, 'conditions.json'))
    expect(conditions.conditions[1].systemPrompt).toBe('{subject} counts as a sandwich.')
    expect(conditions.conditions[2].systemPrompt).toBe('{subject} does not count as a sandwich.')
  })

  it('exits 2 and writes nothing when a registry would not validate', () => {
    const cwd = setUp()
    const before = readFileSync(join(cwd, 'questions.json'), 'utf8')
    expect(() => runCli(cwd, ['init', ...BURRITO, '--id', 'Not A Slug', '--yes'])).toThrow(
      /would not validate/,
    )
    expect(readFileSync(join(cwd, 'questions.json'), 'utf8')).toBe(before)
    expect(readdirSync(join(cwd, 'tests/fixtures/responses')).length).toBeGreaterThan(0)
  })

  it('exits 2 with usage when there is no --question and no terminal', () => {
    const cwd = setUp()
    expect(() => runCli(cwd, ['init'])).toThrow(/--question/)
  })

  it('exits 2 without --yes when it cannot ask for confirmation', () => {
    const cwd = setUp()
    const before = readFileSync(join(cwd, 'questions.json'), 'utf8')
    expect(() => runCli(cwd, ['init', ...BURRITO])).toThrow(/--yes/)
    expect(readFileSync(join(cwd, 'questions.json'), 'utf8')).toBe(before)
  })
})
