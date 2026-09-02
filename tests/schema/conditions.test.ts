import { describe, expect, it } from 'vitest'
import {
  CONTROL_CONDITION,
  CONTROL_CONDITION_ID,
  conditionsRegistrySchema,
  enabledConditions,
  isPlainCondition,
  renderPrompt,
  renderSystemPrompt,
  renderTemplate,
} from '../../src/schema/conditions.ts'
import { loadConditions, loadConditionsRegistry } from '../../src/data/registries.ts'

const registry = loadConditionsRegistry()

const HOT_DOG = {
  id: 'hot-dog',
  subject: 'a hot dog',
  text: 'Is a hot dog a sandwich? One word answer.',
}

describe('the committed conditions.json', () => {
  it('validates', () => {
    expect(conditionsRegistrySchema.safeParse(registry).success).toBe(true)
  })

  it('leads with an enabled control condition that changes nothing', () => {
    const [first] = loadConditions()
    expect(first?.id).toBe(CONTROL_CONDITION_ID)
    expect(isPlainCondition(first!)).toBe(true)
  })

  it('ships an assertion arm whose system prompt contradicts a No answer', () => {
    const asserted = loadConditions().find((c) => c.id === 'asserted')
    expect(asserted).toBeDefined()
    expect(renderSystemPrompt(asserted!, HOT_DOG)).toBe('A hot dog is a sandwich.')
  })

  it('renders each arm against each question, so tacos are not told about hot dogs', () => {
    const asserted = loadConditions().find((c) => c.id === 'asserted')!
    expect(renderSystemPrompt(asserted, { subject: 'a taco' })).toBe('A taco is a sandwich.')
  })

  it('gives every condition a label and a description for the report', () => {
    for (const condition of registry.conditions) {
      expect(condition.label.length).toBeGreaterThan(0)
      expect(condition.description.length).toBeGreaterThan(0)
    }
  })
})

describe('conditionsRegistrySchema rejects', () => {
  const valid = () => structuredClone(registry) as any

  it('a duplicate condition id', () => {
    const copy = valid()
    copy.conditions.push({ ...copy.conditions[1] })
    const result = conditionsRegistrySchema.safeParse(copy)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('duplicate condition id')
  })

  it('a control entry carrying a system prompt', () => {
    const copy = valid()
    copy.conditions[0].systemPrompt = 'Be brief.'
    const result = conditionsRegistrySchema.safeParse(copy)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain(
      'control condition must have no system prompt',
    )
  })

  it('a control entry carrying a temperature', () => {
    const copy = valid()
    copy.conditions[0].temperature = 0
    expect(conditionsRegistrySchema.safeParse(copy).success).toBe(false)
  })

  it('a registry whose first entry is not the control', () => {
    const copy = valid()
    copy.conditions.reverse()
    const result = conditionsRegistrySchema.safeParse(copy)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('first condition must be')
  })

  it('a disabled control', () => {
    const copy = valid()
    copy.conditions[0].enabled = false
    const result = conditionsRegistrySchema.safeParse(copy)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('cannot be disabled')
  })

  it('an id that is not a lowercase slug', () => {
    const copy = valid()
    copy.conditions[1].id = 'Asserted!'
    expect(conditionsRegistrySchema.safeParse(copy).success).toBe(false)
  })

  it('a temperature outside 0..2', () => {
    const copy = valid()
    copy.conditions[1].temperature = 3
    expect(conditionsRegistrySchema.safeParse(copy).success).toBe(false)
  })

  it('an empty list', () => {
    expect(conditionsRegistrySchema.safeParse({ conditions: [] }).success).toBe(false)
  })
})

describe('enabledConditions', () => {
  it('filters to enabled entries and keeps the control first', () => {
    const copy = structuredClone(registry) as any
    copy.conditions[1].enabled = false
    const ids = enabledConditions(copy).map((c) => c.id)
    expect(ids[0]).toBe('control')
    expect(ids).not.toContain(copy.conditions[1].id)
  })

  it('lets a fork run the control alone', () => {
    const copy = structuredClone(registry) as any
    for (const condition of copy.conditions.slice(1)) condition.enabled = false
    expect(enabledConditions(copy).map((c) => c.id)).toEqual(['control'])
  })
})

describe('renderTemplate', () => {
  it('substitutes the subject and capitalizes a leading article', () => {
    expect(renderTemplate('{subject} is a sandwich.', HOT_DOG)).toBe('A hot dog is a sandwich.')
  })

  it('leaves the subject lowercase mid-sentence', () => {
    expect(renderTemplate('Assume {subject} is a sandwich.', HOT_DOG)).toBe(
      'Assume a hot dog is a sandwich.',
    )
  })

  it('substitutes every occurrence', () => {
    expect(renderTemplate('{subject}, {subject}.', HOT_DOG)).toBe('A hot dog, a hot dog.')
  })

  it('returns a template with no placeholder untouched', () => {
    expect(renderTemplate('Answer honestly.', HOT_DOG)).toBe('Answer honestly.')
  })
})

describe('renderPrompt', () => {
  it('sends the question text alone under the control', () => {
    expect(renderPrompt(CONTROL_CONDITION, HOT_DOG)).toBe(HOT_DOG.text)
    expect(renderSystemPrompt(CONTROL_CONDITION, HOT_DOG)).toBeNull()
  })

  it('wraps the question with a rendered prefix and suffix', () => {
    const condition = {
      ...CONTROL_CONDITION,
      id: 'framed',
      promptPrefix: 'Context: {subject} is served in bread.',
      promptSuffix: 'Be decisive.',
    }
    expect(renderPrompt(condition, HOT_DOG)).toBe(
      'Context: a hot dog is served in bread. Is a hot dog a sandwich? One word answer. Be decisive.',
    )
  })

  it('never alters the question text itself, so the one-word instruction survives', () => {
    const condition = { ...CONTROL_CONDITION, id: 'prefixed', promptPrefix: 'Quickly:' }
    expect(renderPrompt(condition, HOT_DOG)).toContain(HOT_DOG.text)
  })
})
