import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  editionKeyFor,
  editionKeyFromFilename,
  editionKind,
  editionStart,
  isCadence,
  isoWeekFor,
  isoWeekFromFilename,
  newestEditionFirst,
  newestFirst,
  runPathFor,
  runPathForKey,
  utcDateFor,
} from '../../src/data/paths.ts'
import {
  buildManifest,
  listRunFilenames,
  loadAllRuns,
  validateAllRuns,
  writeManifest,
} from '../../src/data/index.ts'
import { dataManifestSchema } from '../../src/schema/manifest.ts'
import { loadQuestions } from '../../src/data/registries.ts'

const example = JSON.parse(
  readFileSync(new URL('../fixtures/runs/example.json', import.meta.url), 'utf8'),
)

describe('isoWeekFor', () => {
  const week = (iso: string) => isoWeekFor(new Date(`${iso}T00:00:00Z`))

  it('labels an ordinary mid-year date', () => {
    expect(week('2026-09-01')).toBe('2026-W36')
  })

  // The interesting cases are all at year boundaries, where the ISO year and
  // the calendar year disagree. Week 1 is the week containing the first
  // Thursday, so early January can belong to the previous ISO year and late
  // December to the next one.
  it.each([
    ['2026-01-01', '2026-W01'], // a Thursday: its own week 1
    ['2025-12-29', '2026-W01'], // Monday of the week containing 1 Jan 2026
    ['2024-12-30', '2025-W01'], // late December belonging to the next ISO year
    ['2019-12-30', '2020-W01'],
    ['2021-01-01', '2020-W53'], // early January belonging to the previous ISO year
    ['2016-01-03', '2015-W53'],
    ['2016-01-04', '2016-W01'],
    ['2027-01-03', '2026-W53'],
    ['2027-01-04', '2027-W01'],
  ])('places %s in %s', (date, expected) => {
    expect(week(date)).toBe(expected)
  })

  it('is computed in UTC, not local time', () => {
    // 23:30 UTC on a Sunday is already Monday in some timezones. Both instants
    // below are the same moment and must land in the same edition.
    const sundayLate = new Date('2026-08-30T23:30:00Z')
    const mondayEarly = new Date('2026-08-31T00:30:00Z')
    expect(isoWeekFor(sundayLate)).toBe('2026-W35')
    expect(isoWeekFor(mondayEarly)).toBe('2026-W36')
  })

  it('zero-pads single-digit weeks so labels sort as strings', () => {
    expect(week('2026-01-05')).toBe('2026-W02')
  })
})

describe('run file paths', () => {
  it('derives the canonical path from a week label', () => {
    expect(runPathFor('2026-W36')).toBe('data/runs/2026-W36.json')
  })

  it('recognizes a run filename and ignores anything else', () => {
    expect(isoWeekFromFilename('2026-W36.json')).toBe('2026-W36')
    expect(isoWeekFromFilename('README.md')).toBeNull()
    expect(isoWeekFromFilename('2026-W36.json.bak')).toBeNull()
    expect(isoWeekFromFilename('latest.json')).toBeNull()
  })

  it('sorts newest edition first as plain strings', () => {
    const weeks = [{ isoWeek: '2026-W02' }, { isoWeek: '2026-W36' }, { isoWeek: '2025-W53' }]
    expect(weeks.sort(newestFirst).map((w) => w.isoWeek)).toEqual([
      '2026-W36',
      '2026-W02',
      '2025-W53',
    ])
  })
})

describe('edition keys', () => {
  const at = (iso: string) => new Date(iso)

  it('are the ISO week at weekly cadence and the UTC date at daily cadence', () => {
    expect(editionKeyFor(at('2026-09-02T15:00:00Z'), 'week')).toBe('2026-W36')
    expect(editionKeyFor(at('2026-09-02T15:00:00Z'), 'day')).toBe('2026-09-02')
  })

  it('take the UTC date, not the local one', () => {
    // 23:30 UTC on the 2nd is already the 3rd east of Greenwich. One instant,
    // one edition, regardless of the runner's timezone.
    expect(utcDateFor(at('2026-09-02T23:30:00Z'))).toBe('2026-09-02')
    expect(utcDateFor(at('2026-09-03T00:30:00Z'))).toBe('2026-09-03')
  })

  it('derive the run path from either kind of key', () => {
    expect(runPathForKey('2026-W36')).toBe('data/runs/2026-W36.json')
    expect(runPathForKey('2026-09-02')).toBe('data/runs/2026-09-02.json')
  })

  it('parse both filename shapes and reject everything else', () => {
    expect(editionKeyFromFilename('2026-W36.json')).toBe('2026-W36')
    expect(editionKeyFromFilename('2026-09-02.json')).toBe('2026-09-02')
    expect(editionKeyFromFilename('README.md')).toBeNull()
    expect(editionKeyFromFilename('2026-09-02.json.bak')).toBeNull()
    expect(editionKeyFromFilename('2026-09.json')).toBeNull()
    expect(editionKeyFromFilename('latest.json')).toBeNull()
    // The weekly parser stays strict: a daily file is not a week.
    expect(isoWeekFromFilename('2026-09-02.json')).toBeNull()
  })

  it('know which kind a key is', () => {
    expect(editionKind('2026-W36')).toBe('week')
    expect(editionKind('2026-09-02')).toBe('day')
    expect(editionKind('2026-36')).toBeNull()
  })

  it('accept exactly the two cadences', () => {
    expect(isCadence('week')).toBe(true)
    expect(isCadence('day')).toBe(true)
    expect(isCadence('weekly')).toBe(false)
    expect(isCadence('')).toBe(false)
  })

  it('start at Monday 00:00 UTC for a week and midnight UTC for a day', () => {
    expect(new Date(editionStart('2026-W36')).toISOString()).toBe('2026-08-31T00:00:00.000Z')
    expect(new Date(editionStart('2026-09-02')).toISOString()).toBe('2026-09-02T00:00:00.000Z')
    // Year boundaries, where week 1 can start in the previous calendar year.
    expect(new Date(editionStart('2026-W01')).toISOString()).toBe('2025-12-29T00:00:00.000Z')
    expect(new Date(editionStart('2020-W53')).toISOString()).toBe('2020-12-28T00:00:00.000Z')
    expect(new Date(editionStart('2021-W01')).toISOString()).toBe('2021-01-04T00:00:00.000Z')
  })

  it('agree with isoWeekFor about which week a Monday opens', () => {
    for (const key of ['2026-W01', '2026-W36', '2020-W53', '2015-W53', '2027-W01']) {
      expect(isoWeekFor(new Date(editionStart(key)))).toBe(key)
    }
  })

  it('refuse a string that is not a key rather than sorting it somewhere quietly', () => {
    expect(() => editionStart('latest')).toThrow(/not an edition key/)
  })

  it('order daily and weekly keys on one timeline, newest first', () => {
    const keys = [
      { editionKey: '2026-W35' },
      { editionKey: '2026-09-05' },
      { editionKey: '2026-W36' },
      { editionKey: '2026-08-29' },
      { editionKey: '2026-09-08' },
    ]
    expect(keys.sort(newestEditionFirst).map((k) => k.editionKey)).toEqual([
      '2026-09-08', // Tuesday of week 37
      '2026-09-05', // Saturday of week 36
      '2026-W36', // starts Monday 31 Aug
      '2026-08-29', // Saturday of week 35
      '2026-W35',
    ])
  })

  it('put the week ahead of the day that opens it', () => {
    // Monday 31 Aug 2026 and week 36 start at the same instant.
    const tied = [{ editionKey: '2026-08-31' }, { editionKey: '2026-W36' }]
    expect(tied.sort(newestEditionFirst).map((k) => k.editionKey)).toEqual([
      '2026-W36',
      '2026-08-31',
    ])
    const reversed = [{ editionKey: '2026-W36' }, { editionKey: '2026-08-31' }]
    expect(reversed.sort(newestEditionFirst).map((k) => k.editionKey)).toEqual([
      '2026-W36',
      '2026-08-31',
    ])
  })
})

describe('the committed data directory', () => {
  it('validates with no problems', () => {
    expect(validateAllRuns()).toEqual([])
  })

  it('has a manifest matching what the generator would produce right now', () => {
    // The manifest is committed, so it can drift from the run files. This is
    // the check that catches a run file added without regenerating the index.
    const committed = JSON.parse(
      readFileSync(new URL('../../data/index.json', import.meta.url), 'utf8'),
    )
    expect(committed).toEqual(buildManifest())
  })

  it('produces a manifest matching its own schema', () => {
    expect(dataManifestSchema.safeParse(buildManifest()).success).toBe(true)
  })

  it('ships at least one run so the site always has something to render', () => {
    const runs = loadAllRuns()
    expect(runs.length).toBeGreaterThan(0)
    const latest = runs[0]!.run
    // The edition asks what the registry has live, in registry order.
    expect(latest.questions.map((q) => q.id)).toEqual(loadQuestions().map((q) => q.id))
  })

  it('labels any placeholder data as such, and real data as real', () => {
    // This used to assert isMock === true, which was correct only while the
    // committed run was the generated sample. What actually matters is that
    // the flag tells the truth: mock runs get the site's "sample data" notice,
    // real ones do not.
    for (const { path, run } of loadAllRuns()) {
      expect(typeof run.isMock, `${path} has no isMock flag`).toBe('boolean')
      if (!run.isMock) {
        // A real run must have come from somewhere reproducible.
        expect(run.runnerVersion, `${path} has no runner version`).toBeTruthy()
      }
    }
  })
})

describe('manifest generation against a temporary data directory', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'hdb-data-'))
    mkdirSync(join(root, 'data/runs'), { recursive: true })
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const writeRun = (isoWeek: string, mutate: (run: any) => void = () => {}) => {
    const run = structuredClone(example)
    run.isoWeek = isoWeek
    run.runId = `run-${isoWeek}`
    mutate(run)
    writeFileSync(join(root, `data/runs/${isoWeek}.json`), JSON.stringify(run, null, 2))
  }

  it('lists and orders run files newest first, ignoring non-run files', () => {
    writeRun('2026-W34')
    writeRun('2026-W36')
    writeRun('2026-W35')
    writeFileSync(join(root, 'data/runs/README.md'), '# not a run\n')
    expect(listRunFilenames(root)).toEqual(['2026-W36.json', '2026-W35.json', '2026-W34.json'])
  })

  /** A daily edition: keyed by date, still recording the week it fell in. */
  const writeDailyRun = (date: string) => {
    const run = structuredClone(example)
    run.isoWeek = isoWeekFor(new Date(`${date}T12:00:00Z`))
    run.editionKey = date
    run.runId = `run-${date}`
    writeFileSync(join(root, `data/runs/${date}.json`), JSON.stringify(run, null, 2))
  }

  it('interleaves daily and weekly editions chronologically, newest first', () => {
    writeRun('2026-W36')
    writeDailyRun('2026-09-05')
    writeRun('2026-W35')
    writeDailyRun('2026-08-29')
    expect(listRunFilenames(root)).toEqual([
      '2026-09-05.json',
      '2026-W36.json',
      '2026-08-29.json',
      '2026-W35.json',
    ])
    // The loader and the manifest follow the same order as the listing.
    expect(loadAllRuns(root).map((file) => file.path)).toEqual([
      'data/runs/2026-09-05.json',
      'data/runs/2026-W36.json',
      'data/runs/2026-08-29.json',
      'data/runs/2026-W35.json',
    ])
    expect(buildManifest(root).runs.map((entry) => entry.editionKey)).toEqual([
      '2026-09-05',
      '2026-W36',
      '2026-08-29',
      '2026-W35',
    ])
  })

  it('carries the edition key into the manifest, falling back to the week for older files', () => {
    writeRun('2026-W36')
    writeDailyRun('2026-09-05')
    const manifest = buildManifest(root)
    expect(dataManifestSchema.safeParse(manifest).success).toBe(true)
    const daily = manifest.runs.find((entry) => entry.path.endsWith('2026-09-05.json'))
    expect(daily).toMatchObject({ editionKey: '2026-09-05', isoWeek: '2026-W36' })
    // The example fixture predates cadences and has no editionKey of its own.
    const weekly = manifest.runs.find((entry) => entry.path.endsWith('2026-W36.json'))
    expect(weekly).toMatchObject({ editionKey: '2026-W36', isoWeek: '2026-W36' })
  })

  it('validates a daily file whose editionKey matches its name', () => {
    writeDailyRun('2026-09-05')
    expect(validateAllRuns(root)).toEqual([])
  })

  it('tallies each question by majority verdict, counting a model once', () => {
    writeRun('2026-W36')
    const [entry] = buildManifest(root).runs
    expect(entry?.modelCount).toBe(4)
    expect(entry?.questionIds).toEqual(['hot-dog', 'hamburger', 'taco'])
    const hotDog = entry?.questions.find((q) => q.questionId === 'hot-dog')
    // The fixture has three answering models and one that errored on every question.
    expect(hotDog?.conditionId).toBe('control')
    expect(hotDog?.okCount).toBe(3)
    expect(hotDog?.errorCount).toBe(1)
    expect(hotDog?.verdicts).toEqual({ yes: 1, no: 2, other: 0 })
    expect(entry?.conditionIds).toEqual(['control'])
  })

  it('regenerates byte-identically from unchanged inputs', () => {
    writeRun('2026-W36')
    writeManifest(root)
    const first = readFileSync(join(root, 'data/index.json'), 'utf8')
    writeManifest(root)
    expect(readFileSync(join(root, 'data/index.json'), 'utf8')).toBe(first)
  })

  it('returns an empty manifest rather than failing when there is no data', () => {
    rmSync(join(root, 'data/runs'), { recursive: true })
    expect(buildManifest(root).runs).toEqual([])
  })
})

describe('validateAllRuns reports', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'hdb-invalid-'))
    mkdirSync(join(root, 'data/runs'), { recursive: true })
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('the file path and the JSON pointer of a schema violation', () => {
    const run = structuredClone(example)
    run.results[0].models[0].samples[0].usage.outputTokens = -4
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(run))
    const [problem] = validateAllRuns(root)
    expect(problem).toContain('data/runs/2026-W36.json')
    expect(problem).toContain('/results/0/models/0/samples/0/usage/outputTokens')
  })

  it('a file whose contents disagree with its own filename', () => {
    const run = structuredClone(example)
    run.isoWeek = '2026-W12'
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(run))
    const [problem] = validateAllRuns(root)
    expect(problem).toContain('named 2026-W36 but its isoWeek is 2026-W12')
  })

  it('a weekly file whose isoWeek disagrees with its name even when editionKey agrees', () => {
    const run = structuredClone(example)
    run.isoWeek = '2026-W12'
    run.editionKey = '2026-W36'
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(run))
    const problems = validateAllRuns(root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('named 2026-W36 but its isoWeek is 2026-W12')
  })

  it('a daily file whose editionKey disagrees with its name', () => {
    const run = structuredClone(example)
    run.editionKey = '2026-09-04'
    writeFileSync(join(root, 'data/runs/2026-09-05.json'), JSON.stringify(run))
    const problems = validateAllRuns(root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(
      '/editionKey: file is named 2026-09-05 but its editionKey is 2026-09-04',
    )
  })

  it('a daily file that omits editionKey, since its week cannot name it', () => {
    // Without the key the site would have nothing to match this file by:
    // the week it records names a different (weekly) edition.
    const run = structuredClone(example)
    writeFileSync(join(root, 'data/runs/2026-09-05.json'), JSON.stringify(run))
    const problems = validateAllRuns(root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('/editionKey: file is named 2026-09-05 but records no editionKey')
  })

  it('a file written by a newer schema than this checkout understands', () => {
    const run = structuredClone(example)
    run.schemaVersion = 99
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(run))
    expect(validateAllRuns(root)[0]).toContain('written by a newer runner')
  })

  it('malformed JSON', () => {
    writeFileSync(join(root, 'data/runs/2026-W36.json'), '{ not json')
    expect(validateAllRuns(root)[0]).toContain('is not valid JSON')
  })

  it('every bad file, not only the first', () => {
    writeFileSync(join(root, 'data/runs/2026-W35.json'), '{ nope')
    writeFileSync(join(root, 'data/runs/2026-W36.json'), '{ also nope')
    expect(validateAllRuns(root)).toHaveLength(2)
  })
})
