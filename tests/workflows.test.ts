import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

/**
 * GitHub Actions reports a malformed workflow by not running it, or by failing
 * on a push to main. Both are slow ways to find out. These checks assert the
 * properties that actually matter, locally.
 *
 * The security-relevant one is the last describe block: the pull-request
 * workflow must never reference a secret, because that is what makes it safe
 * to run on pull requests from forks.
 */
const WORKFLOW_DIR = fileURLToPath(new URL('../.github/workflows/', import.meta.url))

interface Workflow {
  name?: string
  on?: unknown
  permissions?: Record<string, string> | string
  concurrency?: unknown
  jobs?: Record<string, { steps?: Array<Record<string, unknown>>; 'timeout-minutes'?: number }>
}

const workflows = existsSync(WORKFLOW_DIR)
  ? readdirSync(WORKFLOW_DIR)
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .map((file) => ({
        file,
        raw: readFileSync(WORKFLOW_DIR + file, 'utf8'),
        workflow: parse(readFileSync(WORKFLOW_DIR + file, 'utf8')) as Workflow,
      }))
  : []

describe('every workflow', () => {
  it('there is at least one', () => {
    expect(workflows.length).toBeGreaterThan(0)
  })

  it.each(workflows)('$file parses and has a name, triggers and jobs', ({ workflow }) => {
    expect(typeof workflow.name).toBe('string')
    // `on:` is parsed as the boolean true by YAML 1.1 semantics in some
    // parsers; either way it must be present.
    expect(workflow.on).toBeDefined()
    expect(Object.keys(workflow.jobs ?? {}).length).toBeGreaterThan(0)
  })

  it.each(workflows)(
    '$file declares explicit permissions rather than inheriting',
    ({ workflow }) => {
      // The default token permissions are broad. Every workflow here narrows them.
      expect(workflow.permissions, 'no permissions block').toBeDefined()
    },
  )

  it.each(workflows)('$file bounds every job with a timeout', ({ workflow }) => {
    for (const [name, job] of Object.entries(workflow.jobs ?? {})) {
      expect(job['timeout-minutes'], `job "${name}" has no timeout-minutes`).toBeGreaterThan(0)
    }
  })

  it.each(workflows)('$file pins actions to a major version', ({ raw }) => {
    const uses = [...raw.matchAll(/uses:\s*([^\s#]+)/g)].map((match) => match[1]!)
    for (const action of uses) {
      // Either a local path or owner/name@ref. A bare name with no ref would
      // silently track whatever the default branch does.
      expect(action, `unpinned action: ${action}`).toMatch(/@/)
    }
  })

  it.each(workflows)('$file reads the Node version from .nvmrc, not a literal', ({ raw }) => {
    if (!raw.includes('setup-node')) return
    expect(raw).toContain('node-version-file: .nvmrc')
  })
})

describe('the pull-request workflow', () => {
  const ci = workflows.find((w) => w.file === 'ci.yml')

  it('exists', () => {
    expect(ci).toBeDefined()
  })

  it('runs on pull_request and on push to main', () => {
    const on = ci!.workflow.on as Record<string, unknown>
    expect(on).toHaveProperty('pull_request')
    expect(on).toHaveProperty('push')
  })

  it('is read-only', () => {
    expect(ci!.workflow.permissions).toEqual({ contents: 'read' })
  })

  it('cancels superseded runs on the same ref', () => {
    expect(JSON.stringify(ci!.workflow.concurrency)).toContain('cancel-in-progress')
  })

  it('references no secrets at all, which is what makes fork PRs safe', () => {
    // A workflow that never receives a key cannot leak one, regardless of what
    // a malicious pull request tries to do.
    //
    // Comments are stripped first: this file explains the rule in prose, and a
    // check that tripped on its own explanation would push the reasoning out of
    // the workflow.
    const yamlOnly = ci!.raw
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n')
    expect(yamlOnly).not.toMatch(/secrets\./)
    expect(yamlOnly).not.toMatch(/_API_KEY/)
  })

  it('runs lint, typecheck, tests, and a keyless benchmark', () => {
    expect(ci!.raw).toContain('npm run lint')
    expect(ci!.raw).toContain('npm run typecheck')
    expect(ci!.raw).toContain('npm test')
    expect(ci!.raw).toContain('--mock')
  })
})
