/**
 * `bench:smoke` — one live call to one provider.
 *
 * The point is to answer "does this adapter actually work against the real
 * API right now", which no amount of fixture testing can tell you. Fixtures
 * prove the adapter parses what the vendor *used to* send.
 *
 * Prints text, usage and timing, and nothing else. One call, one model, one
 * question — cents at most.
 */
import { getAdapter } from '../providers/registry.ts'
import { registerAllAdapters } from '../providers/all.ts'
import { loadModels } from '../data/registries.ts'
import { credentialsFromEnv, PROVIDER_ENV_VARS, type ProviderId } from '../env.ts'
import { tokensPerSecond } from '../providers/timing.ts'
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../runner/run.ts'
import { ProviderError } from '../providers/types.ts'

const DEFAULT_PROMPT = 'Is a hot dog a sandwich? One word answer.'

export interface SmokeOptions {
  provider: string
  prompt?: string
  timeoutMs?: number
}

/**
 * Ping every provider that has a key configured.
 *
 * The command to run after adding keys: it answers "does each of these
 * actually work" in one go, which is otherwise seven invocations and seven
 * chances to stop paying attention.
 *
 * Providers with no key are reported as skipped, not failed — the same
 * distinction the runner makes. Exit code is 1 only if a *configured* provider
 * failed, so a partial key set still exits 0.
 */
export async function runSmokeAll(options: { prompt?: string } = {}): Promise<number> {
  registerAllAdapters()

  const providers = [...new Set(loadModels().map((model) => model.provider))]
  const credentials = credentialsFromEnv()

  const configured = providers.filter((provider) => credentials[provider as ProviderId])
  const skipped = providers.filter((provider) => !credentials[provider as ProviderId])

  console.log(
    `Pinging ${configured.length} of ${providers.length} providers ` +
      `(${skipped.length} have no key configured).\n`,
  )

  const results: Array<{ provider: string; ok: boolean }> = []

  for (const provider of configured) {
    console.log('─'.repeat(64))
    const code = await runSmoke({ provider, prompt: options.prompt })
    results.push({ provider, ok: code === 0 })
    console.log('')
  }

  console.log('─'.repeat(64))
  console.log('\nSummary\n')

  const width = Math.max(...providers.map((p) => p.length))
  for (const provider of providers) {
    const result = results.find((entry) => entry.provider === provider)
    if (!result) {
      const envVar = PROVIDER_ENV_VARS[provider as ProviderId] ?? '(unknown)'
      console.log(`  ${provider.padEnd(width)}  skipped   set ${envVar} to include it`)
    } else {
      console.log(`  ${provider.padEnd(width)}  ${result.ok ? 'ok' : 'FAILED'}`)
    }
  }

  const failed = results.filter((entry) => !entry.ok)
  if (configured.length === 0) {
    console.log('\nNo keys configured. Add them to .env, then run this again.')
    return 2
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} configured provider(s) failed.`)
    return 1
  }
  console.log(`\nAll ${configured.length} configured provider(s) responded.`)
  return 0
}

/** Run one live call. Returns a process exit code. */
export async function runSmoke(options: SmokeOptions): Promise<number> {
  registerAllAdapters()

  const models = loadModels()
  const model = models.find((entry) => entry.provider === options.provider)
  if (!model) {
    const available = [...new Set(models.map((m) => m.provider))].sort().join(', ')
    console.error(
      `No enabled model in models.json for provider "${options.provider}".\n` +
        `Providers with an enabled model: ${available}`,
    )
    return 2
  }

  const credentials = credentialsFromEnv()
  const apiKey = credentials[options.provider as ProviderId]
  if (!apiKey) {
    const envVar = PROVIDER_ENV_VARS[options.provider as ProviderId] ?? '(unknown variable)'
    console.error(
      `No API key for "${options.provider}". Set ${envVar} in your .env file.\n` +
        `To exercise the pipeline without any key, use: npm run bench -- run --mock`,
    )
    return 2
  }

  const adapter = getAdapter(options.provider)
  const controller = new AbortController()
  const prompt = options.prompt ?? DEFAULT_PROMPT

  console.log(`${adapter.displayName} — ${model.displayName} (${model.modelId})`)
  console.log(`Prompt: ${prompt}\n`)

  try {
    const result = await adapter.complete(
      { modelId: model.modelId, prompt, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
      {
        credentials: { apiKey },
        fetch: globalThis.fetch,
        signal: controller.signal,
      },
    )

    console.log(`Answer:      ${JSON.stringify(result.text)}`)
    console.log(
      `Usage:       ${result.usage.inputTokens} in, ${result.usage.outputTokens} out, ` +
        `${result.usage.totalTokens} total`,
    )
    console.log(
      `             reasoning: ${describe(result.usage.reasoningTokens)}, ` +
        `cached input: ${describe(result.usage.cachedInputTokens)}`,
    )
    console.log(`Latency:     ${result.timing.totalMs.toFixed(0)} ms total`)
    console.log(
      `             ttfb: ${
        result.timing.ttfbMs === null ? 'not reported' : `${result.timing.ttfbMs.toFixed(0)} ms`
      }`,
    )
    const tps = tokensPerSecond(result.usage.outputTokens, result.timing.totalMs)
    console.log(`             ${tps === null ? 'n/a' : `${tps.toFixed(1)} output tokens/sec`}`)

    // A total larger than input + output means the vendor counts something
    // else (usually reasoning) in its billed total. Worth pointing out, since
    // it is the single most common source of confusion in these numbers.
    const derived = result.usage.inputTokens + result.usage.outputTokens
    if (result.usage.totalTokens > derived) {
      console.log(
        `\nNote: this vendor's total (${result.usage.totalTokens}) exceeds input + output ` +
          `(${derived}). The difference is counted separately, not inside outputTokens. ` +
          `See docs/usage-normalization.md.`,
      )
    }
    return 0
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(`\nFailed (${error.category}): ${error.message}`)
      return 1
    }
    console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}

/** Null means the vendor does not report it, which is not the same as zero. */
function describe(value: number | null): string {
  return value === null ? 'not reported' : String(value)
}
