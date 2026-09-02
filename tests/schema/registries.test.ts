import { describe, expect, it } from 'vitest'
import {
  ONE_WORD_SUFFIX,
  enabledQuestions,
  questionsRegistrySchema,
} from '../../src/schema/questions.ts'
import { enabledModels, findModel, modelsRegistrySchema } from '../../src/schema/models.ts'
import {
  loadModels,
  loadModelsRegistry,
  loadQuestions,
  loadQuestionsRegistry,
} from '../../src/data/registries.ts'
import { PROVIDER_IDS } from '../../src/env.ts'

const questionsRegistry = loadQuestionsRegistry()
const modelsRegistry = loadModelsRegistry()

describe('the committed questions.json', () => {
  it('validates', () => {
    expect(questionsRegistrySchema.safeParse(questionsRegistry).success).toBe(true)
  })

  it('ships the hot dog, hamburger and taco questions, enabled and in that order', () => {
    expect(loadQuestions().map((q) => q.id)).toEqual(['hot-dog', 'hamburger', 'taco'])
  })

  it('asks the exact one-word-answer prompt for each', () => {
    expect(loadQuestions().map((q) => q.text)).toEqual([
      'Is a hot dog a sandwich? One word answer.',
      'Is a hamburger a sandwich? One word answer.',
      'Is a taco a sandwich? One word answer.',
    ])
  })

  it('gives every question a deadpan report title', () => {
    for (const question of loadQuestions()) {
      expect(question.reportTitle).toMatch(/^Sandwich Classification Benchmark: /)
    }
  })
})

describe('questionsRegistrySchema rejects', () => {
  const valid = () => structuredClone(questionsRegistry) as any

  it('duplicate question ids', () => {
    const registry = valid()
    registry.questions.push({ ...registry.questions[0] })
    const result = questionsRegistrySchema.safeParse(registry)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('duplicate question id')
  })

  it('text that does not end with the one-word instruction', () => {
    const registry = valid()
    registry.questions[0].text = 'Is a hot dog a sandwich?'
    const result = questionsRegistrySchema.safeParse(registry)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain(ONE_WORD_SUFFIX)
  })

  it('an id that is not a lowercase slug', () => {
    const registry = valid()
    registry.questions[0].id = 'Hot Dog'
    expect(questionsRegistrySchema.safeParse(registry).success).toBe(false)
  })

  it('an empty question list', () => {
    expect(questionsRegistrySchema.safeParse({ questions: [] }).success).toBe(false)
  })
})

describe('enabledQuestions', () => {
  it('filters to enabled entries and preserves file order', () => {
    const registry = structuredClone(questionsRegistry) as any
    registry.questions[1].enabled = false
    expect(enabledQuestions(registry).map((q) => q.id)).toEqual(['hot-dog', 'taco'])
  })
})

describe('the committed models.json', () => {
  it('validates', () => {
    expect(modelsRegistrySchema.safeParse(modelsRegistry).success).toBe(true)
  })

  it('lists every one of the seven planned providers, enabled or not', () => {
    // A provider can be switched off while its account is sorted out, but it
    // stays in the registry so the switch back is a one-word change.
    const providers = new Set(modelsRegistry.models.map((m) => m.provider))
    expect([...providers].sort()).toEqual(
      ['anthropic', 'openai', 'gemini', 'xai', 'mistral', 'deepseek', 'llama-hosted'].sort(),
    )
  })

  it('enables at least one model, and only from providers with an adapter', () => {
    const enabled = loadModels()
    expect(enabled.length).toBeGreaterThan(0)
    for (const model of enabled) expect(PROVIDER_IDS).toContain(model.provider)
  })

  it('says why every disabled model is disabled', () => {
    for (const model of modelsRegistry.models.filter((m) => !m.enabled)) {
      expect(model.notes, `${model.modelId} is disabled with no note`).toMatch(/Disabled/)
    }
  })

  it('keeps models of one provider adjacent and the flagship first', () => {
    // The first model of a provider keeps the provider-named fixture file, so
    // its position is load-bearing for mock mode.
    const providers = modelsRegistry.models.map((m) => m.provider)
    const firstSeen = new Map<string, number>()
    providers.forEach((provider, index) => {
      if (!firstSeen.has(provider)) firstSeen.set(provider, index)
    })
    for (const [provider, start] of firstSeen) {
      const run = providers.slice(start).findIndex((p) => p !== provider)
      const block = run === -1 ? providers.length - start : run
      expect(providers.slice(start + block)).not.toContain(provider)
    }
  })

  it('only names providers that have a credential variable defined', () => {
    for (const model of modelsRegistry.models) {
      expect(PROVIDER_IDS, `no env var for provider "${model.provider}"`).toContain(model.provider)
    }
  })

  it('records a docs URL and a dated pricing URL for every entry', () => {
    for (const model of modelsRegistry.models) {
      expect(model.docsUrl, `${model.modelId} has no docsUrl`).toMatch(/^https:\/\//)
      expect(model.pricing.pricingUrl).toMatch(/^https:\/\//)
      expect(model.pricing.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('has pricing for every enabled model, so no cost estimate is silently null', () => {
    for (const model of loadModels()) {
      expect(model.pricing.inputUsdPerMTok, `${model.modelId}`).not.toBeNull()
      expect(model.pricing.outputUsdPerMTok, `${model.modelId}`).not.toBeNull()
    }
  })
})

describe('modelsRegistrySchema rejects', () => {
  const valid = () => structuredClone(modelsRegistry) as any

  it('a duplicate provider + modelId pair', () => {
    const registry = valid()
    registry.models.push({ ...registry.models[0] })
    const result = modelsRegistrySchema.safeParse(registry)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('duplicate provider + modelId pair')
  })

  it('but allows the same modelId served by two different providers', () => {
    const registry = valid()
    registry.models.push({ ...registry.models[0], provider: 'openai' })
    expect(modelsRegistrySchema.safeParse(registry).success).toBe(true)
  })

  it('a docsUrl that is not a URL', () => {
    const registry = valid()
    registry.models[0].docsUrl = 'check the docs'
    expect(modelsRegistrySchema.safeParse(registry).success).toBe(false)
  })

  it('an asOf date that is not YYYY-MM-DD', () => {
    const registry = valid()
    registry.models[0].pricing.asOf = 'September 2026'
    expect(modelsRegistrySchema.safeParse(registry).success).toBe(false)
  })

  it('negative pricing', () => {
    const registry = valid()
    registry.models[0].pricing.inputUsdPerMTok = -1
    expect(modelsRegistrySchema.safeParse(registry).success).toBe(false)
  })
})

describe('enabledModels and findModel', () => {
  it('filters to enabled entries and preserves file order', () => {
    const registry = structuredClone(modelsRegistry) as any
    const enabledBefore = enabledModels(registry).map((m: { modelId: string }) => m.modelId)
    // Switch off the second enabled entry and expect exactly it to vanish, in place.
    const victim = enabledBefore[1]
    registry.models.find((m: { modelId: string }) => m.modelId === victim).enabled = false
    expect(enabledModels(registry).map((m: { modelId: string }) => m.modelId)).toEqual(
      enabledBefore.filter((id: string) => id !== victim),
    )
  })

  it('finds an entry by provider and model id', () => {
    expect(findModel(modelsRegistry, 'anthropic', 'claude-opus-5')?.vendor).toBe('Anthropic')
    expect(findModel(modelsRegistry, 'anthropic', 'nope')).toBeUndefined()
  })
})
