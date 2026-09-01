/**
 * `bench:record` — capture a fresh fixture from live calls.
 *
 * Asks one provider every enabled question once, and writes the answers to
 * `tests/fixtures/responses/<provider>.json` for mock mode to replay.
 *
 * ## Redaction
 *
 * A recorded fixture is committed to a public repository, so nothing that could
 * be key material may reach it. Two defences:
 *
 *   1. Only specific fields are copied out of the response — text, token
 *      counts, timings. The vendor's raw payload is never written, so there is
 *      no path for a header or an echoed key to arrive by accident.
 *   2. What *is* written is scanned for key-shaped strings before saving, and
 *      the write is refused if anything matches.
 *
 * The first defence is the real one. The second exists because the first
 * depends on this file continuing to be careful.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getAdapter } from '../providers/registry.ts'
import { registerAllAdapters } from '../providers/all.ts'
import { loadModels, loadQuestions, REPO_ROOT } from '../data/registries.ts'
import { credentialsFromEnv, PROVIDER_ENV_VARS, type ProviderId } from '../env.ts'
import { fixturePathFor } from './mock-fixtures.ts'
import type { MockFixture, MockResponse } from '../providers/mock.ts'

/** Patterns that look like a credential. Refuse to write anything matching one. */
const KEY_SHAPES = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /xai-[A-Za-z0-9]{16,}/,
  /AIza[A-Za-z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{16,}/i,
]

export interface RecordOptions {
  provider: string
  root?: string
}

export async function runRecord(options: RecordOptions): Promise<number> {
  const root = options.root ?? REPO_ROOT
  registerAllAdapters()

  const model = loadModels(root).find((entry) => entry.provider === options.provider)
  if (!model) {
    console.error(`No enabled model in models.json for provider "${options.provider}".`)
    return 2
  }

  const apiKey = credentialsFromEnv()[options.provider as ProviderId]
  if (!apiKey) {
    const envVar = PROVIDER_ENV_VARS[options.provider as ProviderId] ?? '(unknown)'
    console.error(`No API key for "${options.provider}". Set ${envVar} in your .env file.`)
    return 2
  }

  const questions = loadQuestions(root)
  const adapter = getAdapter(options.provider)
  const responses: MockResponse[] = []

  console.log(`Recording ${questions.length} response(s) from ${model.displayName}…\n`)

  for (const question of questions) {
    const controller = new AbortController()
    try {
      const result = await adapter.complete(
        { modelId: model.modelId, prompt: question.text, maxOutputTokens: 64 },
        { credentials: { apiKey }, fetch: globalThis.fetch, signal: controller.signal },
      )
      // Copy named fields only. The vendor's raw payload is deliberately
      // dropped rather than filtered.
      responses.push({
        questionId: question.id,
        text: result.text,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          reasoningTokens: result.usage.reasoningTokens,
          cachedInputTokens: result.usage.cachedInputTokens,
        },
        approxTotalMs: Math.round(result.timing.totalMs),
        approxTtfbMs: result.timing.ttfbMs === null ? null : Math.round(result.timing.ttfbMs),
      })
      console.log(
        `  ${question.id.padEnd(12)} ${JSON.stringify(result.text.slice(0, 40))} ` +
          `(${Math.round(result.timing.totalMs)}ms)`,
      )
    } catch (error) {
      console.error(
        `  ${question.id.padEnd(12)} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return 1
    }
  }

  const fixture: MockFixture & { note: string } = {
    provider: options.provider,
    modelId: model.modelId,
    source: 'live',
    recordedAt: new Date().toISOString().slice(0, 10),
    note: `Captured from live calls to ${model.displayName}.`,
    responses,
  }

  const serialized = JSON.stringify(fixture, null, 2) + '\n'

  for (const shape of KEY_SHAPES) {
    if (shape.test(serialized)) {
      console.error(
        '\nRefusing to write: the recorded content matches a key-shaped pattern.\n' +
          'This is the redaction guard doing its job. Inspect the response before retrying.',
      )
      return 1
    }
  }

  const relativePath = fixturePathFor(options.provider)
  const target = join(root, relativePath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, serialized)

  console.log(`\nWrote ${relativePath}`)
  console.log('Update this provider\'s row in docs/usage-normalization.md to "Verified".')
  return 0
}
