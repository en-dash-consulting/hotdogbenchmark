/**
 * Where a visitor's question goes: the URLs the ask-a-question block builds.
 *
 * Two destinations, both prefilled with the visitor's own words so nothing
 * they typed is dropped on a blank form. The GitHub issue form is the primary
 * route because it exists for every fork; the publisher's contact route is
 * the secondary one and exists only when site.json configures it. Every
 * parameter is encoded here and nowhere else.
 */
import { ONE_WORD_SUFFIX } from '../../schema/questions.ts'
import type { ContactRoute } from '../../schema/site.ts'

/** The question as the runner would send it: trimmed, ending in the suffix. */
export function asPrompt(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed === '') return ''
  return trimmed.endsWith(ONE_WORD_SUFFIX) ? trimmed : `${trimmed} ${ONE_WORD_SUFFIX}`
}

/**
 * A guess at the subject, for the issue form's subject field: "Is a burrito
 * a sandwich?" gives "a burrito". Only the common "Is <subject> a/an …?"
 * shape is guessed; anything else is left for the submitter.
 */
export function guessSubject(text: string): string | null {
  const match = /^(?:is|are)\s+(an?\s+[a-z][a-z' -]*?|[a-z][a-z' -]*?)\s+(?:an?|the)\s+/i.exec(
    text.trim(),
  )
  return match ? match[1]!.trim().toLowerCase() : null
}

/** The issue-form fields, from the question alone. */
export function issueFields(text: string): Record<string, string> {
  const prompt = asPrompt(text)
  const fields: Record<string, string> = { template: 'add_question.yml' }
  if (prompt) fields.text = prompt
  const subject = guessSubject(prompt)
  if (subject) {
    fields.subject = subject
    fields.slug = subject
      .replace(/^(an?|the)\s+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
  return fields
}

/** The prefilled add-a-question issue on the repository. */
export function issueUrl(repository: string, text: string): string {
  const params = new URLSearchParams(issueFields(text))
  return `${repository}/issues/new?${params.toString()}`
}

/** The add-a-model issue form on the repository. */
export function addModelUrl(repository: string): string {
  return `${repository}/issues/new?template=add_model_or_provider.yml`
}

/**
 * The message the contact form opens with: the question, then the fields
 * the registry needs, the credit prompt, and the follow-up line.
 */
export function contactMessage(text: string, siteName: string): string {
  const prompt = asPrompt(text)
  const subject = guessSubject(prompt)
  return [
    `Question for the ${siteName}:`,
    prompt || '(your question here)',
    '',
    `Subject, as it reads in a sentence: ${subject ?? '(e.g. "a burrito")'}`,
    'Why it is worth asking:',
    'Credit me as (or say "no credit"):',
    'Email me when it goes live at:',
  ].join('\n')
}

/** The publisher's contact route, with the message and the title in its fields. */
export function contactUrl(route: ContactRoute, text: string, siteName: string): string {
  const params = new URLSearchParams(route.params)
  params.set(route.titleField, route.title)
  params.set(route.messageField, contactMessage(text, siteName))
  const url = new URL(route.url)
  url.search = params.toString()
  return url.toString()
}
