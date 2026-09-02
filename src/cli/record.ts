/**
 * `bench:record` — capture a fresh fixture from live calls.
 *
 * Asks one provider every enabled question once under every enabled
 * condition, and writes the answers to `tests/fixtures/responses/<provider>.json`
 * for mock mode to replay — so a mock run shows real, recorded framing
 * sensitivity rather than the same answer under every arm.
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
import { loadConditions, loadModels, loadQuestions, REPO_ROOT } from '../data/registries.ts'
import { credentialsFromEnv, PROVIDER_ENV_VARS, type ProviderId } from '../env.ts'
import { renderPrompt, renderSystemPrompt } from '../schema/conditions.ts'
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../runner/run.ts'
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
  /** Which of the provider's models to record. Defaults to its first enabled model. */
  model?: string
  root?: string
}

export async function runRecord(options: RecordOptions): Promise<number> {
  const root = options.root ?? REPO_ROOT
  registerAllAdapters()

  const candidates = loadModels(root).filter((entry) => entry.provider === options.provider)
  const model =
    options.model === undefined
      ? candidates[0]
      : candidates.find((entry) => entry.modelId === options.model)
  if (!model) {
    console.error(
      options.model === undefined
        ? `No enabled model in models.json for provider "${options.provider}".`
        : `No enabled model "${options.model}" for provider "${options.provider}". ` +
            `Enabled: ${candidates.map((c) => c.modelId).join(', ') || '(none)'}`,
    )
    return 2
  }
  // The provider's first model keeps the legacy provider-named file.
  const isFirst = candidates[0]?.modelId === model.modelId

  const apiKey = credentialsFromEnv()[options.provider as ProviderId]
  if (!apiKey) {
    const envVar = PROVIDER_ENV_VARS[options.provider as ProviderId] ?? '(unknown)'
    console.error(`No API key for "${options.provider}". Set ${envVar} in your .env file.`)
    return 2
  }

  const questions = loadQuestions(root)
  const conditions = loadConditions(root)
  const adapter = getAdapter(options.provider)
  const responses: MockResponse[] = []

  console.log(
    `Recording ${questions.length * conditions.length} response(s) from ${model.displayName} ` +
      `(${questions.length} questions x ${conditions.length} conditions)…\n`,
  )

  for (const condition of conditions) {
    for (const question of questions) {
      const controller = new AbortController()
      const systemPrompt = renderSystemPrompt(condition, question)
      const temperature = condition.temperature
      try {
        const result = await adapter.complete(
          {
            modelId: model.modelId,
            prompt: renderPrompt(condition, question),
            // The runner's cap, not a smaller one: a reasoning model given
            // too little room returns nothing, and a fixture of nothing
            // would teach mock mode the wrong lesson.
            maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
            ...(systemPrompt === null ? {} : { systemPrompt }),
            ...(temperature === null ? {} : { temperature }),
          },
          { credentials: { apiKey }, fetch: globalThis.fetch, signal: controller.signal },
        )
        // Copy named fields only. The vendor's raw payload is deliberately
        // dropped rather than filtered.
        responses.push({
          questionId: question.id,
          conditionId: condition.id,
          systemPrompt,
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
          `  ${`${condition.id}/${question.id}`.padEnd(22)} ${JSON.stringify(result.text.slice(0, 40))} ` +
            `(${Math.round(result.timing.totalMs)}ms)`,
        )
      } catch (error) {
        console.error(
          `  ${`${condition.id}/${question.id}`.padEnd(22)} failed: ${error instanceof Error ? error.message : String(error)}`,
        )
        return 1
      }
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

  const relativePath = isFirst
    ? fixturePathFor(options.provider)
    : fixturePathFor(options.provider, model.modelId)
  const target = join(root, relativePath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, serialized)

  console.log(`\nWrote ${relativePath}`)
  console.log('Update this provider\'s row in docs/usage-normalization.md to "Verified".')
  return 0
}
