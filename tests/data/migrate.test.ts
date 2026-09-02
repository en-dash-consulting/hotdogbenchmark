import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIGRATED_CONTROL_CONDITION, migrateRun } from '../../src/data/migrate.ts'
import { loadAllRuns, validateAllRuns } from '../../src/data/index.ts'
import {
  SCHEMA_VERSION,
  benchmarkRunSchema,
  benchmarkRunV1Schema,
  parseBenchmarkRun,
} from '../../src/schema/run.ts'

const exampleV1 = JSON.parse(
  readFileSync(new URL('../fixtures/runs/example-v1.json', import.meta.url), 'utf8'),
)

describe('migrateRun from version 1', () => {
  const v1 = benchmarkRunV1Schema.parse(exampleV1)
  const migrated = migrateRun(v1)

  it('produces a run the current schema accepts', () => {
    const result = benchmarkRunSchema.safeParse(migrated)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('records exactly one condition, the control', () => {
    expect(migrated.conditions).toEqual([MIGRATED_CONTROL_CONDITION])
    expect(migrated.conditions[0]?.systemPrompt).toBeNull()
  })

  it('assigns every existing result to the control, since that is what those runs were', () => {
    expect(migrated.results).toHaveLength(v1.results.length)
    for (const result of migrated.results) {
      expect(result.conditionId).toBe('control')
      expect(result.systemPrompt).toBeNull()
    }
  })

  it('records the question text the run carried as the prompt actually sent', () => {
    for (const result of migrated.results) {
      const question = v1.questions.find((q) => q.id === result.questionId)
      expect(result.prompt).toBe(question?.text)
    }
  })

  it('carries the model results through untouched', () => {
    expect(migrated.results.map((r) => r.models)).toEqual(v1.results.map((r) => r.models))
  })

  it('keeps every top-level field the v1 file had', () => {
    for (const key of [
      'runId',
      'isoWeek',
      'startedAt',
      'finishedAt',
      'runnerVersion',
      'gitSha',
      'isMock',
      'questions',
    ] as const) {
      expect(migrated[key]).toEqual(v1[key])
    }
  })

  it('passes a current run through unchanged', () => {
    expect(migrateRun(migrated)).toBe(migrated)
  })
})

describe('parseBenchmarkRun', () => {
  it('migrates a version-1 input on read', () => {
    const run = parseBenchmarkRun(exampleV1, 'example-v1.json')
    expect(run.schemaVersion).toBe(SCHEMA_VERSION)
    expect(run.results[0]?.conditionId).toBe('control')
  })

  it('still validates a version-1 input against the version-1 rules', () => {
    const broken = structuredClone(exampleV1)
    broken.results[0].models[0].samples[0].usage.outputTokens = -1
    expect(() => parseBenchmarkRun(broken, 'data/runs/2026-W36.json')).toThrow(
      /schema version 1[\s\S]*outputTokens/,
    )
  })

  it('refuses a version this checkout does not understand, naming the fix', () => {
    const future = structuredClone(exampleV1)
    future.schemaVersion = SCHEMA_VERSION + 1
    expect(() => parseBenchmarkRun(future, 'x.json')).toThrow(
      /newer runner[\s\S]*update your checkout/,
    )
  })
})

describe('loading a version-1 file from disk', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'hdb-migrate-'))
    mkdirSync(join(root, 'data/runs'), { recursive: true })
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('migrates in memory and never rewrites the committed file', () => {
    const path = join(root, 'data/runs/2026-W36.json')
    const original = JSON.stringify(exampleV1, null, 2) + '\n'
    writeFileSync(path, original)

    const [file] = loadAllRuns(root)
    expect(file?.run.schemaVersion).toBe(SCHEMA_VERSION)
    expect(file?.run.conditions.map((c) => c.id)).toEqual(['control'])

    // The archive stays byte-identical to what was published.
    expect(readFileSync(path, 'utf8')).toBe(original)
  })

  it('validates a version-1 file as a legitimate member of the archive', () => {
    writeFileSync(join(root, 'data/runs/2026-W36.json'), JSON.stringify(exampleV1))
    expect(validateAllRuns(root)).toEqual([])
  })
})
