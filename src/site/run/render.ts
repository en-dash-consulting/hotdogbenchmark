/**
 * Rendering a client-side run result.
 *
 * Reuses the same scoring, prose and formatting modules the static report
 * pages use, and emits the same CSS class names — so a browser-run report is
 * genuinely the same report, not a lookalike. What it cannot reuse is the
 * .astro components themselves, which are compiled server-side.
 */
import { formatDuration, formatInteger, formatPercent, formatUsd } from '../lib/format.ts'
import { consensusOf, executiveSummary, keyFindings } from '../lib/prose.ts'
import { rankWithDeltas, MOVEMENT_LABEL } from '../lib/rank.ts'
import type { BenchmarkRun, ModelResult, Verdict } from '../../schema/run.ts'

const VERDICT_PRESENTATION: Record<Verdict, { label: string; glyph: string }> = {
  yes: { label: 'Affirmative', glyph: '+' },
  no: { label: 'Negative', glyph: '−' },
  other: { label: 'Non-committal', glyph: '~' },
}

/** Escape anything that came from a model. Model output is untrusted input. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function verdictBadge(verdict: Verdict | null): string {
  if (!verdict) {
    return '<span class="verdict-badge verdict-none"><span class="label">No determination</span></span>'
  }
  const { label, glyph } = VERDICT_PRESENTATION[verdict]
  return `<span class="verdict-badge verdict-${verdict}"><span class="glyph" aria-hidden="true">${glyph}</span><span class="label">${label}</span></span>`
}

function profile(result: ModelResult): string {
  const aggregate = result.aggregate

  if (result.status === 'error') {
    return `
      <article class="profile profile-error">
        <div class="profile-head">
          <div><h3 class="model-name">${escape(result.displayName)}</h3></div>
          ${verdictBadge(null)}
        </div>
        <div class="error-state">
          <p class="error-category">${escape(result.error?.category ?? 'unavailable')}</p>
          <p class="error-message">${escape(result.error?.message ?? 'No response was returned.')}</p>
        </div>
      </article>`
  }

  const metrics: Array<[string, string]> = [
    ['Input tokens', formatInteger(aggregate.inputTokens?.median)],
    ['Output tokens', formatInteger(aggregate.outputTokens?.median)],
    ['Median latency', formatDuration(aggregate.totalMs?.median)],
    ['Time to first token', formatDuration(aggregate.ttfbMs?.median)],
    ['Cost estimate', formatUsd(aggregate.costEstimateUsd)],
    ['Samples', formatInteger(aggregate.sampleCount)],
    ['Instruction compliance', formatPercent(aggregate.followedInstructionRate)],
  ]

  return `
    <article class="profile">
      <div class="profile-head">
        <div>
          <h3 class="model-name">${escape(result.displayName)}</h3>
          <p class="model-id tabular">${escape(result.modelId)}</p>
        </div>
        ${verdictBadge(aggregate.verdict)}
      </div>
      <blockquote class="answer"><p>${escape(result.samples[0]?.text ?? '')}</p></blockquote>
      <dl class="metrics">
        ${metrics
          .map(
            ([label, value]) =>
              `<div class="metric-row"><dt>${label}</dt><dd class="tabular">${value}</dd></div>`,
          )
          .join('')}
      </dl>
    </article>`
}

/** The full report for one browser-side run. */
export function renderRun(run: BenchmarkRun, subject: string): string {
  const questionId = run.questions[0]?.id ?? ''
  const results = run.results[0]?.models ?? []
  const consensus = consensusOf(results)
  const answering = results.filter((r) => r.samples.length > 0)
  const ranked = rankWithDeltas(results, null)

  const kpis: Array<[string, string]> = [
    ['Models evaluated', String(answering.length)],
    [
      'Consensus position',
      consensus.verdict ? VERDICT_PRESENTATION[consensus.verdict].label : 'None',
    ],
    [
      'Median latency',
      formatDuration(
        answering
          .map((r) => r.aggregate.totalMs?.median)
          .filter((v): v is number => v != null)
          .sort((a, b) => a - b)[Math.floor(answering.length / 2)],
      ),
    ],
  ]

  return `
    <section class="unofficial-banner" role="note">
      <p>
        <strong>Unofficial run.</strong> Produced in your browser from your own API keys. It is not
        published, is not part of the archive, and describes only the models you selected.
      </p>
    </section>

    <h2>Results: ${escape(run.questions[0]?.text ?? '')}</h2>

    <ul class="kpi-row">
      ${kpis
        .map(
          ([label, value]) =>
            `<li class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value tabular">${value}</p></li>`,
        )
        .join('')}
    </ul>

    <section>
      <h3>Executive summary</h3>
      <p class="summary-text">${escape(executiveSummary({ subject, results }))}</p>
      <ul class="findings">
        ${keyFindings({ subject, results })
          .map((f) => `<li><strong>${escape(f.label)}.</strong> ${escape(f.text)}</li>`)
          .join('')}
      </ul>
    </section>

    <section>
      <h3>Standings</h3>
      <div class="table-scroll">
        <table>
          <caption>Vendor standings — unofficial run</caption>
          <thead>
            <tr>
              <th scope="col" class="numeric">Rank</th>
              <th scope="col">Vendor</th>
              <th scope="col">Position</th>
              <th scope="col" class="numeric">Decisiveness</th>
              <th scope="col" class="numeric">Efficiency</th>
              <th scope="col" class="numeric">Composite</th>
            </tr>
          </thead>
          <tbody>
            ${ranked
              .map(
                (entry) => `
              <tr>
                <td class="numeric rank">${entry.rank}</td>
                <th scope="row">${escape(entry.result.displayName)}</th>
                <td>${verdictBadge(entry.result.aggregate.verdict)}</td>
                <td class="numeric">${entry.decisiveness.toFixed(2)}</td>
                <td class="numeric">${entry.efficiency.toFixed(2)}</td>
                <td class="numeric">${entry.composite.toFixed(2)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="footnote muted">
        ${ranked.length > 0 ? `All entries are new (${MOVEMENT_LABEL.new}); an unofficial run has no prior edition to compare against.` : ''}
      </p>
    </section>

    <section>
      <h3>Vendor profiles</h3>
      <div class="profile-grid">${results.map(profile).join('')}</div>
    </section>

    <p class="run-actions">
      <button type="button" id="download-run" data-question="${escape(questionId)}">
        Download run JSON
      </button>
      <button type="button" id="clear-results">Clear results</button>
    </p>`
}
