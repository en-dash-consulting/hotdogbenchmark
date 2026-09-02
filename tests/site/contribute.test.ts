import { describe, expect, it } from 'vitest'
import {
  addModelUrl,
  asPrompt,
  contactMessage,
  contactUrl,
  guessSubject,
  issueFields,
  issueUrl,
} from '../../src/site/lib/contribute.ts'

const REPO = 'https://github.com/taqueria-labs/burritobenchmark'
const ROUTE = {
  url: 'https://publisher.example/',
  params: { showContact: 'true', contactSource: 'burrito-bench' },
  messageField: 'contactMessage',
  titleField: 'contactTitle',
  title: 'Submit a question to the Burrito Benchmark',
}

/** A question with the characters that break naive URL building. */
const HOSTILE = `Is a "po' boy" & a hoagie the same thing?`

describe('asPrompt', () => {
  it('appends the one-word instruction once', () => {
    expect(asPrompt('Is a burrito a sandwich?')).toBe('Is a burrito a sandwich? One word answer.')
    expect(asPrompt('Is a burrito a sandwich? One word answer.')).toBe(
      'Is a burrito a sandwich? One word answer.',
    )
  })

  it('normalizes whitespace and leaves nothing for nothing', () => {
    expect(asPrompt('  Is  a burrito\n a sandwich? ')).toBe(
      'Is a burrito a sandwich? One word answer.',
    )
    expect(asPrompt('   ')).toBe('')
  })
})

describe('guessSubject', () => {
  it('reads the subject off the common shape', () => {
    expect(guessSubject('Is a burrito a sandwich? One word answer.')).toBe('a burrito')
    expect(guessSubject('Is an open-faced sandwich a sandwich?')).toBe('an open-faced sandwich')
    expect(guessSubject('Is cereal a soup?')).toBe('cereal')
  })

  it('guesses nothing for other shapes', () => {
    expect(guessSubject('Should a hot dog count?')).toBeNull()
  })
})

describe('issueFields and issueUrl', () => {
  it('prefill the template, the text, the subject and the slug', () => {
    expect(issueFields('Is a burrito a sandwich?')).toEqual({
      template: 'add_question.yml',
      text: 'Is a burrito a sandwich? One word answer.',
      subject: 'a burrito',
      slug: 'burrito',
    })
  })

  it('encode spaces, quotes and an ampersand', () => {
    const url = issueUrl(REPO, HOSTILE)
    expect(url.startsWith(`${REPO}/issues/new?template=add_question.yml&text=`)).toBe(true)
    const params = new URL(url).searchParams
    expect(params.get('text')).toBe(`${HOSTILE} One word answer.`)
    expect(url).not.toContain('"')
    expect(url.split('&').length).toBe(2)
  })

  it('carry only the template with no question typed', () => {
    expect(issueUrl(REPO, '')).toBe(`${REPO}/issues/new?template=add_question.yml`)
  })

  it('point the add-a-model route at the repository', () => {
    expect(addModelUrl(REPO)).toBe(`${REPO}/issues/new?template=add_model_or_provider.yml`)
  })
})

describe('contactMessage and contactUrl', () => {
  it('carry the question, the registry fields, the credit prompt and the follow-up line', () => {
    const message = contactMessage('Is a burrito a sandwich?', 'Burrito Benchmark')
    expect(message).toContain('Is a burrito a sandwich? One word answer.')
    expect(message).toContain('Subject, as it reads in a sentence: a burrito')
    expect(message).toMatch(/Credit me as/)
    expect(message).toMatch(/Email me when it goes live/)
  })

  it('encode every field and keep the route parameters', () => {
    const url = new URL(contactUrl(ROUTE, HOSTILE, 'Burrito Benchmark'))
    expect(url.origin + url.pathname).toBe('https://publisher.example/')
    expect(url.searchParams.get('showContact')).toBe('true')
    expect(url.searchParams.get('contactSource')).toBe('burrito-bench')
    expect(url.searchParams.get('contactTitle')).toBe('Submit a question to the Burrito Benchmark')
    expect(url.searchParams.get('contactMessage')).toContain(HOSTILE)
    expect(url.href).not.toContain('"')
  })
})
