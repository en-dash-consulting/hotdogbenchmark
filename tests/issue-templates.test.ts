import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

/**
 * GitHub only tells you an issue form is malformed by silently refusing to show
 * it in the new-issue chooser, which is a slow way to find out. These checks
 * assert the parts of the issue-forms schema that GitHub actually rejects.
 */
const templateDir = fileURLToPath(new URL('../.github/ISSUE_TEMPLATE/', import.meta.url))
const VALID_TYPES = new Set(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'])

const forms = readdirSync(templateDir)
  .filter((f) => f.endsWith('.yml') && f !== 'config.yml')
  .map((file) => ({ file, form: parse(readFileSync(templateDir + file, 'utf8')) }))

describe('issue form templates', () => {
  it('ships the four planned forms', () => {
    expect(forms.map((f) => f.file).sort()).toEqual([
      'add_model_or_provider.yml',
      'add_question.yml',
      'bug_report.yml',
      'weird_answer.yml',
    ])
  })

  it.each(forms)('$file has the fields GitHub requires', ({ form }) => {
    expect(typeof form.name).toBe('string')
    expect(typeof form.description).toBe('string')
    expect(Array.isArray(form.body)).toBe(true)
    expect(form.body.length).toBeGreaterThan(0)
  })

  it.each(forms)('$file uses only supported element types with valid ids', ({ form }) => {
    const ids = new Set<string>()
    for (const element of form.body) {
      expect(VALID_TYPES, `unknown type: ${element.type}`).toContain(element.type)
      // Everything except markdown needs a label; everything that collects a
      // value needs an id, and ids must be unique within the form.
      if (element.type !== 'markdown') {
        expect(typeof element.attributes?.label).toBe('string')
        expect(typeof element.id).toBe('string')
        expect(ids.has(element.id), `duplicate id: ${element.id}`).toBe(false)
        ids.add(element.id)
      }
      if (element.type === 'dropdown' || element.type === 'checkboxes') {
        expect(Array.isArray(element.attributes.options)).toBe(true)
        expect(element.attributes.options.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('add-a-model template', () => {
  const form = forms.find((f) => f.file === 'add_model_or_provider.yml')!.form
  const ids = new Set(form.body.map((e: { id?: string }) => e.id))

  it('captures everything models.json needs before the entry can be trusted', () => {
    for (const field of [
      'provider',
      'vendor',
      'model-id',
      'display-name',
      'docs-url',
      'input-price',
      'output-price',
      'pricing-url',
    ]) {
      expect(ids, `missing field: ${field}`).toContain(field)
    }
  })

  it('asks about streaming and usage reporting', () => {
    expect(ids).toContain('streaming')
    expect(ids).toContain('usage-reporting')
  })
})

describe('add-a-question template', () => {
  const form = forms.find((f) => f.file === 'add_question.yml')!.form
  const ids = new Set(form.body.map((e: { id?: string }) => e.id))

  it('captures every field a questions.json entry needs', () => {
    for (const field of ['text', 'subject', 'slug', 'report-title', 'tagline', 'why']) {
      expect(ids, `missing field: ${field}`).toContain(field)
    }
  })

  it('tells the reporter the question must end with the one-word suffix', () => {
    const text = form.body.find((e: { id?: string }) => e.id === 'text')
    expect(text.attributes.description).toContain('One word answer.')
  })

  it('asks how to credit the submitter, offers an opt-out, and says what happens next', () => {
    for (const field of ['credit-name', 'credit-url', 'credit-opt-out']) {
      expect(ids, `missing field: ${field}`).toContain(field)
    }
    const intro = form.body.find((e: { type: string }) => e.type === 'markdown')
    expect(intro.attributes.value).toMatch(/proposed/)
    expect(intro.attributes.value).toMatch(/Up next/)
    expect(form.description).not.toMatch(/every week/)
  })
})

describe('pull request template', () => {
  const body = readFileSync(new URL('../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url), 'utf8')

  it('requires the author to confirm no secrets are included', () => {
    const secretsItem = body
      .split('\n')
      .find((line) => /^- \[ \]/.test(line) && /secret/i.test(line))
    expect(secretsItem).toBeDefined()
    expect(secretsItem).toMatch(/\.env/)
  })
})
