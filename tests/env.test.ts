import { describe, expect, it } from 'vitest'
import {
  PROVIDER_ENV_VARS,
  PROVIDER_IDS,
  configuredProviders,
  credentialsFromEnv,
} from '../src/env.ts'

/**
 * A sentinel that looks like a real key. If it ever shows up in something
 * `configuredProviders()` hands back, the reporting path is leaking secrets.
 */
const SENTINEL = 'sk-do-not-leak-me-0123456789'

describe('configuredProviders', () => {
  it('reports every known provider with its env var name', () => {
    const statuses = configuredProviders({})
    expect(statuses.map((s) => s.provider)).toEqual(PROVIDER_IDS)
    for (const status of statuses) {
      expect(status.envVar).toBe(PROVIDER_ENV_VARS[status.provider])
      expect(status.configured).toBe(false)
    }
  })

  it('treats an empty or whitespace-only variable as not configured', () => {
    expect(configuredProviders({ ANTHROPIC_API_KEY: '' })[0]?.configured).toBe(false)
    expect(configuredProviders({ ANTHROPIC_API_KEY: '   ' })[0]?.configured).toBe(false)
    expect(configuredProviders({ ANTHROPIC_API_KEY: SENTINEL })[0]?.configured).toBe(true)
  })

  it('never includes a key value anywhere in its output', () => {
    const env = Object.fromEntries(Object.values(PROVIDER_ENV_VARS).map((name) => [name, SENTINEL]))
    const serialized = JSON.stringify(configuredProviders(env))
    expect(serialized).not.toContain(SENTINEL)
    expect(serialized).not.toContain('sk-')
  })
})

describe('credentialsFromEnv', () => {
  it('returns keys only for providers that have one', () => {
    const credentials = credentialsFromEnv({ XAI_API_KEY: SENTINEL, OPENAI_API_KEY: '' })
    expect(credentials).toEqual({ xai: SENTINEL })
  })

  it('trims surrounding whitespace so a copy-pasted key still works', () => {
    expect(credentialsFromEnv({ XAI_API_KEY: `  ${SENTINEL}\n` }).xai).toBe(SENTINEL)
  })
})
