import { db } from '@/lib/data'
import type { CakeSize, LeadTimeRule } from '@/lib/data/types'

export type Occasion = 'quinceanera' | 'boda' | 'cumpleanos'

export interface DepositPolicy {
  cakeDepositPct: number
  cancelFullRefundHours: number
  cancelPartialRefundHours: number
  partialRefundPct: number
}

/**
 * The deposit and cancellation policy, from `settings.deposit_policy`.
 *
 * Stated plainly on every cake page BEFORE any CTA. A deposit taken
 * without the cancellation terms in front of the customer is a chargeback
 * waiting to happen.
 */
export async function getDepositPolicy(): Promise<DepositPolicy> {
  const raw = await db.getSettings('deposit_policy')
  const value = (raw ?? {
    cake_deposit_pct: 30,
    cancel_full_refund_hours: 72,
    cancel_partial_refund_hours: 48,
    partial_refund_pct: 50,
  }) as Record<string, number>

  return {
    cakeDepositPct: value.cake_deposit_pct,
    cancelFullRefundHours: value.cancel_full_refund_hours,
    cancelPartialRefundHours: value.cancel_partial_refund_hours,
    partialRefundPct: value.partial_refund_pct,
  }
}

/** Whole days, rounded up — nobody says "72 hours' notice" out loud. */
export const leadDays = (hours: number) => Math.ceil(hours / 24)

/**
 * The lead-time facts for a page, straight from `lead_time_rules` and
 * `cake_options`. Change a rule in the admin portal and this text
 * changes; it is never a hard-coded string.
 */
export interface LeadTimeFacts {
  baseDays: number
  tieredDays: number | null
  largeOrderDays: number | null
  extras: { label: string; extraDays: number }[]
}

export async function getLeadTimeFacts(): Promise<LeadTimeFacts> {
  const [rules, options] = await Promise.all([db.getLeadTimeRules(), db.getCakeOptions()])
  const cakeRules = rules.filter((r: LeadTimeRule) => r.appliesTo === 'cake')

  const base = cakeRules.find(
    (r) => r.minTiers === null && r.minServings === null && r.requiresFinishSlug === null,
  )
  const tiered = cakeRules.find((r) => r.minTiers !== null)
  const large = cakeRules.find((r) => r.minServings !== null)

  const extras = options
    .filter((o) => o.extraLeadHours > 0)
    .map((o) => ({ label: o.label, extraDays: leadDays(o.extraLeadHours) }))

  return {
    baseDays: leadDays(base?.minLeadHours ?? 48),
    tieredDays: tiered ? leadDays(tiered.minLeadHours) : null,
    largeOrderDays: large ? leadDays(large.minLeadHours) : null,
    extras,
  }
}

/** Cheapest and dearest base price, for the AggregateOffer. */
export function priceRange(sizes: CakeSize[]) {
  const prices = sizes.map((s) => s.basePriceCents)
  return { low: Math.min(...prices), high: Math.max(...prices) }
}
