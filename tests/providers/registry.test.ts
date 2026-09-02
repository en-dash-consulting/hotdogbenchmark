import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  CREDENTIAL_ENV_VARS,
  clearAdapters,
  getAdapter,
  hasAdapter,
  listAdapterIds,
  overrideAllAdapters,
  registerAdapter,
} from '../../src/providers/registry.ts'
import {
  DEFAULT_RETRYABLE,
  ProviderError,
  categoryForStatus,
  toProviderError,
} from '../../src/providers/types.ts'
import { fakeContext, makeFakeAdapter } from '../helpers/fake-adapter.ts'

afterEach(() => clearAdapters())

describe('the adapter registry', () => {
  it('registers and retrieves an adapter', () => {
    const adapter = makeFakeAdapter({ id: 'anthropic' })
    registerAdapter(adapter)
    expect(getAdapter('anthropic')).toBe(adapter)
    expect(hasAdapter('anthropic')).toBe(true)
  })

  it('names every registered provider when asked for one that does not exist', () => {
    registerAdapter(makeFakeAdapter({ id: 'openai' }))
    registerAdapter(makeFakeAdapter({ id: 'anthropic' }))
    expect(() => getAdapter('gogle')).toThrow(
      'Unknown provider "gogle". Known providers: anthropic, openai',
    )
  })

  it('says so plainly when nothing is registered at all', () => {
    expect(() => getAdapter('anthropic')).toThrow('(none registered)')
  })

  it('refuses to register the same id twice', () => {
    registerAdapter(makeFakeAdapter({ id: 'xai' }))
    expect(() => registerAdapter(makeFakeAdapter({ id: 'xai' }))).toThrow('already registered')
  })

  it('lists ids in sorted order for stable output', () => {
    for (const id of ['xai', 'anthropic', 'mistral']) {
      registerAdapter(makeFakeAdapter({ id }))
    }
    expect(listAdapterIds()).toEqual(['anthropic', 'mistral', 'xai'])
  })
})

describe('overrideAllAdapters', () => {
  it('swaps every adapter and can restore them, which is how --mock works', () => {
    const real = makeFakeAdapter({ id: 'anthropic', answer: 'from the network' })
    registerAdapter(real)

    const restore = overrideAllAdapters((original) =>
      makeFakeAdapter({ id: original.id, answer: 'from a fixture' }),
    )
    expect(getAdapter('anthropic')).not.toBe(real)

    restore()
    expect(getAdapter('anthropic')).toBe(real)
  })
})

describe('the fake adapter satisfies ProviderAdapter unmodified', () => {
  it('answers through the one-method interface', async () => {
    const adapter = makeFakeAdapter({ answer: 'Yes' })
    let firstTokenSeen = false
    const result = await adapter.complete(
      {
        modelId: 'model-a',
        prompt: 'Is a hot dog a sandwich? One word answer.',
        maxOutputTokens: 16,
      },
      fakeContext({ onFirstToken: () => (firstTokenSeen = true) }),
    )
    expect(result.text).toBe('Yes')
    expect(result.usage.outputTokens).toBe(1)
    expect(result.timing.totalMs).toBe(100)
    expect(firstTokenSeen).toBe(true)
    expect(adapter.calls).toHaveLength(1)
  })
})

describe('ProviderError', () => {
  it('derives retryability from the category by default', () => {
    expect(new ProviderError('rate_limit', 'slow down').retryable).toBe(true)
    expect(new ProviderError('auth', 'bad key').retryable).toBe(false)
    expect(new ProviderError('bad_response', 'what is this').retryable).toBe(false)
  })

  it('lets an adapter override retryability when it knows better', () => {
    expect(new ProviderError('server', 'gone for good', { retryable: false }).retryable).toBe(false)
  })

  it('serializes to exactly the shape a run file stores', () => {
    const error = new ProviderError('rate_limit', 'Rate limited', { providerStatus: 429 })
    expect(error.toJSON()).toEqual({
      category: 'rate_limit',
      message: 'Rate limited',
      retryable: true,
      providerStatus: 429,
    })
  })

  it('covers every category in the retryability table', () => {
    expect(Object.keys(DEFAULT_RETRYABLE).sort()).toEqual([
      'auth',
      'bad_response',
      'rate_limit',
      'server',
      'timeout',
      'unknown',
    ])
  })
})

describe('categoryForStatus', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate_limit'],
    [400, 'bad_response'],
    [404, 'bad_response'],
    [500, 'server'],
    [503, 'server'],
    [200, 'unknown'],
  ])('maps %i to %s', (status, expected) => {
    expect(categoryForStatus(status)).toBe(expected)
  })
})

describe('toProviderError', () => {
  it('passes a ProviderError through unchanged', () => {
    const original = new ProviderError('auth', 'nope')
    expect(toProviderError(original)).toBe(original)
  })

  it('recognizes an aborted fetch as the timeout the runner asked for', () => {
    const abort = new Error('The operation was aborted')
    abort.name = 'AbortError'
    const error = toProviderError(abort)
    expect(error.category).toBe('timeout')
    expect(error.retryable).toBe(true)
  })

  it('wraps an arbitrary throw as unknown without losing the cause', () => {
    const error = toProviderError(new TypeError('undefined is not a function'))
    expect(error.category).toBe('unknown')
    expect(error.message).toBe('undefined is not a function')
    expect(error.cause).toBeInstanceOf(TypeError)
  })

  it('handles a non-Error throw', () => {
    expect(toProviderError('a string, somehow').category).toBe('unknown')
  })
})

/**
 * The runtime-agnostic boundary is enforced by an ESLint rule, but a rule can
 * be disabled by whoever is in a hurry. This is the second lock: it reads the
 * source and fails on the text itself.
 */
describe('the runtime-agnostic boundary', () => {
  const dirs = ['src/providers', 'src/runner', 'src/schema']
  const extraFiles = ['src/data/paths.ts']
  const root = fileURLToPath(new URL('../../', import.meta.url))

  /**
   * Comments are stripped before scanning. These files *document* the rule —
   * the doc comment on `AdapterContext` explains why adapters may not read
   * `process.env` — and a check that forbade naming the thing it enforces would
   * push that explanation out of the code.
   */
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  const sourceFiles = [
    ...extraFiles.map((path) => ({
      path,
      raw: readFileSync(join(root, path), 'utf8'),
      code: stripComments(readFileSync(join(root, path), 'utf8')),
    })),
    ...dirs.flatMap((dir) => {
      let names: string[]
      try {
        names = readdirSync(join(root, dir))
      } catch {
        return []
      }
      return names
        .filter((name) => name.endsWith('.ts'))
        .map((name) => ({
          path: `${dir}/${name}`,
          raw: readFileSync(join(root, dir, name), 'utf8'),
          code: stripComments(readFileSync(join(root, dir, name), 'utf8')),
        }))
    }),
  ]

  it('covers a non-trivial number of files', () => {
    expect(sourceFiles.length).toBeGreaterThan(3)
  })

  it.each(sourceFiles)('$path imports no node: builtin', ({ code }) => {
    expect(code).not.toMatch(/from\s+['"]node:/)
    expect(code).not.toMatch(/require\(\s*['"]node:/)
  })

  it.each(sourceFiles)('$path never reads process.env', ({ code }) => {
    expect(code).not.toMatch(/process\s*\.\s*env/)
  })

  // Suppressions live *in* comments, so this one scans the raw file.
  it.each(sourceFiles)('$path adds no lint suppression to get around it', ({ raw }) => {
    expect(raw).not.toMatch(/eslint-disable/)
    expect(raw).not.toMatch(/@ts-(ignore|expect-error|nocheck)/)
  })
})

describe('CREDENTIAL_ENV_VARS', () => {
  it('names a variable for every provider in models.json', () => {
    const models = JSON.parse(
      readFileSync(new URL('../../models.json', import.meta.url), 'utf8'),
    ) as { models: { provider: string }[] }
    for (const model of models.models) {
      expect(CREDENTIAL_ENV_VARS, `no credential variable for "${model.provider}"`).toHaveProperty(
        model.provider,
      )
    }
  })
})
