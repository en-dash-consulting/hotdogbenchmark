/**
 * Estimating what a call cost.
 *
 * **These are estimates, and the report says so on every page that shows one.**
 * They are computed from a per-token price table in `models.json` stamped with
 * the date it was read. Prices change, promotional rates expire, and several of
 * the vendors here bill differently at different times of day or above a
 * context threshold. A figure here is "what this many tokens would cost at the
 * rate we recorded on that date", not a number from anyone's invoice.
 *
 * The estimate uses input and output rates only. Cached-input and reasoning
 * tokens are deliberately *not* discounted or surcharged — see the note on
 * {@link estimateCost} for why that produces a defensible upper bound rather
 * than a wrong number.
 */
import type { Pricing } from '../schema/models.ts'
import type { Usage } from '../schema/run.ts'

/** USD per token, from a per-million-token rate. */
const PER_MILLION = 1_000_000

/**
 * Estimate the USD cost of one call.
 *
 * Returns **null** when pricing is missing, never zero. A model whose cost we
 * do not know is not a free model, and the report renders null as a dash.
 *
 * ## Why cached tokens are not discounted here
 *
 * Several vendors bill cache reads at a fraction of the input rate — often a
 * tenth. Applying that discount would need a third rate per model, and each
 * vendor defines the discount slightly differently. Charging cached tokens at
 * the full input rate instead makes every estimate a consistent **upper
 * bound**: never understated, and comparable across vendors because the same
 * rule was applied to all of them.
 *
 * The same argument covers reasoning tokens. Where a vendor counts them inside
 * `outputTokens` they are already priced; where it reports them separately they
 * are excluded here, which understates that vendor. That asymmetry is recorded
 * per provider in `docs/usage-normalization.md` rather than papered over.
 */
export function estimateCost(usage: Usage, pricing: Pricing | null | undefined): number | null {
  if (!pricing) return null
  const { inputUsdPerMTok, outputUsdPerMTok } = pricing
  if (inputUsdPerMTok == null || outputUsdPerMTok == null) return null

  const cost =
    (usage.inputTokens * inputUsdPerMTok) / PER_MILLION +
    (usage.outputTokens * outputUsdPerMTok) / PER_MILLION

  // Six decimals: these are fractions of a cent, and rounding to fewer would
  // report most of this benchmark's calls as costing nothing at all.
  return Math.round(cost * 1_000_000) / 1_000_000
}

/** Sum a list of estimates, treating null as "unknown" rather than zero. */
export function sumCosts(costs: Array<number | null>): number | null {
  const known = costs.filter((cost): cost is number => cost !== null)
  if (known.length === 0) return null
  return Math.round(known.reduce((a, b) => a + b, 0) * 1_000_000) / 1_000_000
}

/**
 * Format an estimate for display.
 *
 * Costs here are fractions of a cent, so a plain currency format would render
 * nearly every value as "$0.00" and make the column useless.
 */
export function formatCost(cost: number | null): string {
  if (cost === null) return '—'
  if (cost === 0) return '$0'
  if (cost < 0.01) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(4)}`
}
