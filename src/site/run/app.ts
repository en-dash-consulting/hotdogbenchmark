/**
 * The bring-your-own-keys runner, client side.
 *
 * Loaded only on /run/, which is only built when RUN_YOUR_OWN_ENABLED is true,
 * so this bundle never affects the rest of the site's JavaScript budget.
 *
 * It uses the *same* runner and adapters as the CLI. The only difference is the
 * `fetch` handed to them, which routes through the proxy.
 */
import { runBenchmark } from '../../runner/run.ts'
import { createAnthropicAdapter } from '../../providers/anthropic.ts'
import { createOpenAiAdapter } from '../../providers/openai.ts'
import { createGeminiAdapter } from '../../providers/gemini.ts'
import { createXaiAdapter } from '../../providers/xai.ts'
import { createMistralAdapter } from '../../providers/mistral.ts'
import { createDeepSeekAdapter } from '../../providers/deepseek.ts'
import { createLlamaHostedAdapter } from '../../providers/llama-hosted.ts'
import { ONE_WORD_SUFFIX } from '../../schema/questions.ts'
import { clearKeys, configuredProviders, getKey, setKey } from './keys.ts'
import { createProxyFetch } from './proxy-fetch.ts'
import { renderRun } from './render.ts'
import type { ProviderAdapter } from '../../providers/types.ts'
import type { ModelEntry } from '../../schema/models.ts'
import type { BenchmarkRun } from '../../schema/run.ts'

const ADAPTERS: Record<string, () => ProviderAdapter> = {
  anthropic: createAnthropicAdapter,
  openai: createOpenAiAdapter,
  gemini: createGeminiAdapter,
  xai: createXaiAdapter,
  mistral: createMistralAdapter,
  deepseek: createDeepSeekAdapter,
  'llama-hosted': createLlamaHostedAdapter,
}

interface Identity {
  userId: string
  displayName: string
  csrfToken: string
}

const root = document.querySelector<HTMLElement>('[data-run-app]')
if (root) {
  const proxyOrigin = root.dataset.proxyOrigin ?? ''
  const models: ModelEntry[] = JSON.parse(root.dataset.models ?? '[]')

  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null

  const signInButton = el<HTMLButtonElement>('sign-in')
  const signOutButton = el<HTMLButtonElement>('sign-out')
  const identityLabel = el('identity')
  const form = el<HTMLFormElement>('run-form')
  const questionInput = el<HTMLTextAreaElement>('question')
  const appendToggle = el<HTMLInputElement>('append-template')
  const promptPreview = el('prompt-preview')
  const samplesInput = el<HTMLInputElement>('samples')
  const status = el('run-status')
  const output = el('run-output')
  const clearKeysButton = el<HTMLButtonElement>('clear-keys')

  let identity: Identity | null = null
  let lastRun: BenchmarkRun | null = null

  // --- Identity ----------------------------------------------------------

  async function refreshIdentity() {
    try {
      const response = await fetch(`${proxyOrigin}/auth/me`, { credentials: 'include' })
      identity = response.ok ? ((await response.json()) as Identity) : null
    } catch {
      // The proxy being unreachable is a signed-out state as far as the UI is
      // concerned; it must not throw and leave the page half-initialized.
      identity = null
    }

    const signedIn = identity !== null
    if (identityLabel) {
      identityLabel.textContent = signedIn
        ? `Signed in as ${identity!.displayName}`
        : 'Not signed in'
    }
    if (signInButton) signInButton.hidden = signedIn
    if (signOutButton) signOutButton.hidden = !signedIn
    if (form) form.hidden = !signedIn
  }

  signInButton?.addEventListener('click', () => {
    window.location.href = `${proxyOrigin}/auth/login`
  })

  signOutButton?.addEventListener('click', async () => {
    // Keys are cleared locally *first*, so a failed sign-out request cannot
    // leave them sitting in storage.
    clearKeys()
    renderKeyFields()
    try {
      await fetch(`${proxyOrigin}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: identity ? { 'x-csrf-token': identity.csrfToken } : {},
      })
    } finally {
      await refreshIdentity()
    }
  })

  // --- Keys --------------------------------------------------------------

  function renderKeyFields() {
    const container = el('key-fields')
    if (!container) return
    const providers = [...new Set(models.map((model) => model.provider))]

    container.innerHTML = providers
      .map((provider) => {
        const has = getKey(provider) !== null
        return `
          <div class="key-field">
            <label for="key-${provider}">${provider}</label>
            <input type="password" id="key-${provider}" data-provider="${provider}"
              autocomplete="off" spellcheck="false"
              placeholder="${has ? 'saved for this tab' : 'not set'}" />
          </div>`
      })
      .join('')

    for (const input of container.querySelectorAll<HTMLInputElement>('input[data-provider]')) {
      input.addEventListener('change', () => {
        setKey(input.dataset.provider!, input.value)
        input.value = ''
        input.placeholder = getKey(input.dataset.provider!) ? 'saved for this tab' : 'not set'
        renderModelChoices()
      })
    }
  }

  clearKeysButton?.addEventListener('click', () => {
    clearKeys()
    renderKeyFields()
    renderModelChoices()
    announce('All keys cleared from this tab.')
  })

  // --- Model selection ---------------------------------------------------

  function renderModelChoices() {
    const container = el('model-choices')
    if (!container) return
    const available = new Set(configuredProviders())

    container.innerHTML = models
      .map((model) => {
        const enabled = available.has(model.provider)
        return `
          <div class="model-choice">
            <input type="checkbox" id="model-${model.provider}" value="${model.provider}"
              ${enabled ? 'checked' : 'disabled'} />
            <label for="model-${model.provider}">
              ${model.displayName}
              ${enabled ? '' : `<span class="muted"> — no ${model.provider} key set</span>`}
            </label>
          </div>`
      })
      .join('')
  }

  // --- Prompt preview ----------------------------------------------------

  function updatePreview() {
    if (!promptPreview || !questionInput) return
    const base = questionInput.value.trim()
    const withTemplate =
      appendToggle?.checked && base && !base.endsWith(ONE_WORD_SUFFIX)
        ? `${base} ${ONE_WORD_SUFFIX}`
        : base
    promptPreview.textContent = withTemplate || '(nothing yet)'
  }

  questionInput?.addEventListener('input', updatePreview)
  appendToggle?.addEventListener('change', updatePreview)

  function announce(message: string) {
    if (status) status.textContent = message
  }

  // --- Running -----------------------------------------------------------

  form?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!identity || !questionInput) return

    const base = questionInput.value.trim()
    if (!base) {
      announce('Enter a research question first.')
      questionInput.focus()
      return
    }

    const text =
      appendToggle?.checked && !base.endsWith(ONE_WORD_SUFFIX) ? `${base} ${ONE_WORD_SUFFIX}` : base

    const chosen = [
      ...document.querySelectorAll<HTMLInputElement>('#model-choices input:checked'),
    ].map((input) => input.value)

    if (chosen.length === 0) {
      announce('Select at least one model. Models without a key are disabled.')
      return
    }

    const selected = models.filter((model) => chosen.includes(model.provider))
    const credentials = Object.fromEntries(
      selected.map((model) => [model.provider, getKey(model.provider) ?? '']),
    )

    if (output) output.innerHTML = ''
    announce(`Running ${selected.length} model${selected.length === 1 ? '' : 's'}…`)

    try {
      const outcome = await runBenchmark({
        questions: [
          {
            id: 'custom',
            subject: 'this item',
            text,
            reportTitle: 'Unofficial run',
            enabled: true,
          },
        ],
        models: selected,
        credentials,
        // A proxy-routing fetch is built per provider, because the proxy needs
        // to know which allowlist entry to check the URL against.
        getAdapter: (provider) => ADAPTERS[provider]!(),
        fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : String(input)
          const provider =
            selected.find((model) => url.includes(hostOf(model.provider)))?.provider ??
            selected[0]!.provider
          return createProxyFetch({
            proxyOrigin,
            provider,
            csrfToken: identity!.csrfToken,
          })(input, init)
        }) as typeof globalThis.fetch,
        samples: Math.min(5, Math.max(1, Number(samplesInput?.value ?? 3))),
        concurrency: 2,
        runId: `browser-${Date.now()}`,
        runnerVersion: 'browser',
        isMock: false,
        onProgress: (progress) => {
          if (progress.type === 'sample-done') {
            announce(
              `${progress.displayName}: sample ${progress.sampleIndex} of ${progress.sampleCount}`,
            )
          } else if (progress.type === 'job-error') {
            announce(`${progress.displayName} failed: ${progress.error}`)
          }
        },
      })

      lastRun = outcome.run
      announce(
        `Done. ${outcome.okJobs} model${outcome.okJobs === 1 ? '' : 's'} answered` +
          (outcome.errorJobs > 0 ? `, ${outcome.errorJobs} failed.` : '.'),
      )
      if (output) output.innerHTML = renderRun(outcome.run, 'this item')
      wireResultActions()
    } catch (error) {
      announce(`Run failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  function hostOf(provider: string): string {
    const hosts: Record<string, string> = {
      anthropic: 'api.anthropic.com',
      openai: 'api.openai.com',
      gemini: 'generativelanguage.googleapis.com',
      xai: 'api.x.ai',
      mistral: 'api.mistral.ai',
      deepseek: 'api.deepseek.com',
      'llama-hosted': 'api.together.xyz',
    }
    return hosts[provider] ?? ''
  }

  function wireResultActions() {
    el<HTMLButtonElement>('download-run')?.addEventListener('click', () => {
      if (!lastRun) return
      // Downloaded, never uploaded. Nothing from this page reaches data/.
      const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `unofficial-run-${lastRun.runId}.json`
      link.click()
      URL.revokeObjectURL(url)
    })

    el<HTMLButtonElement>('clear-results')?.addEventListener('click', () => {
      if (output) output.innerHTML = ''
      lastRun = null
      announce('Results cleared.')
    })
  }

  renderKeyFields()
  renderModelChoices()
  updatePreview()
  void refreshIdentity()
}
