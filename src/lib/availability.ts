/* =====================================================================
   PROMPT-07 Part A — the availability engine.
   ---------------------------------------------------------------------
   This is the part that must be right. Everything else is UI.

   A pure function over data, so it is identical under the demo adapter
   and under Supabase, and so it can be tested without either.

   TIMEZONE RULES, NON-NEGOTIABLE
   - Every stored instant is UTC.
   - Every slot is generated as a WALL-CLOCK time in America/New_York and
     converted with `fromZonedTime` (via localToUtc).
   - Never `new Date('2026-11-01T10:00')`, never `setHours`, never manual
     offset arithmetic. A 10:00 AM pickup is 10:00 AM local on both sides
     of both DST Sundays, and there are tests that say so.
   ===================================================================== */

import { localToUtc, addBusinessDays, businessDate } from '@/lib/datetime'
import type {
  BusinessDate,
  CakeOption,
  CakeSize,
  LeadTimeRule,
  OrderType,
  WallTime,
} from '@/lib/data/types'

/* ------------------------------------------------------------------ */
/* Reasons — structured, so the UI can localize them.                  */
/* A greyed-out calendar with no explanation is a conversion killer.   */
/* ------------------------------------------------------------------ */

export type UnavailableReason =
  | { code: 'lead'; hours: number; days: number }
  | { code: 'blackout' }
  | { code: 'closed' }
  | { code: 'tooFar'; maxAdvanceDays: number }
  | { code: 'full' }

export interface LeadBreakdown {
  /** The binding minimum, before option extras. */
  baseHours: number
  /** Extra hours contributed by chosen options, itemised. */
  extras: { label: string; hours: number }[]
  totalHours: number
  maxAdvanceDays: number
}

export interface EngineData {
  sizes: CakeSize[]
  options: CakeOption[]
  rules: LeadTimeRule[]
  blackoutDates: string[]
  openingHours: { dow: number; opensAt: WallTime; closesAt: WallTime }[]
  capacityRules: {
    appliesTo: OrderType
    dow: number
    windowStart: WallTime
    windowEnd: WallTime
    slotMinutes: number
    maxPerSlot: number
  }[]
  /** Non-cancelled orders, as UTC ISO instants, with their type. */
  booked: { orderType: OrderType; pickupAt: string }[]
}

export interface EngineQuery {
  orderType: OrderType
  /** The instant the shopper is asking from. Injected, never read here. */
  now: Date
  fromDate: BusinessDate
  days: number
  sizeId?: string
  tiers?: number
  servings?: number
  /** Slugs of the chosen flavor/filling/frosting/finish options. */
  optionSlugs?: string[]
}

export interface SlotResult {
  startsAt: WallTime
  startsAtUtc: string
  remaining: number
  isAvailable: boolean
}

export interface DateResult {
  date: BusinessDate
  slots: SlotResult[]
  /** Empty when the date is bookable. */
  reasons: UnavailableReason[]
}

export interface AvailabilityResponse {
  requiredLeadHours: number
  earliestLegal: string
  breakdown: LeadBreakdown
  dates: DateResult[]
}

const mins = (t: WallTime) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Day of week for a business date, without constructing a local Date. */
export function dowOf(date: BusinessDate): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Step 1 — required lead hours.
 *
 * Take the MAXIMUM across the size minimum and every matching rule —
 * not the first match, and never the sum. THEN add the extra hours from
 * every selected option.
 *
 * Worked example from PROMPT-07:
 *   2-tier + fondant + edible photo
 *   = max(size 168, rule-2tier 168, rule-photo 72, rule-servings 72, base 48)
 *   + fondant 72 + photo 24
 *   = 264 hours.
 */
export function computeRequiredLeadHours(
  data: Pick<EngineData, 'sizes' | 'options' | 'rules'>,
  query: Pick<EngineQuery, 'orderType' | 'sizeId' | 'tiers' | 'servings' | 'optionSlugs'>,
): LeadBreakdown {
  const size = query.sizeId ? data.sizes.find((s) => s.id === query.sizeId) : undefined
  const chosenSlugs = query.optionSlugs ?? []
  const chosen = data.options.filter((o) => chosenSlugs.includes(o.slug))

  // Servings default to the size's own upper bound when not stated, so a
  // "serves 60+" rule cannot be dodged by simply not answering.
  const servings = query.servings ?? size?.servingsMax ?? 0
  const tiers = query.tiers ?? 1

  const matching = data.rules.filter(
    (r) =>
      r.appliesTo === query.orderType &&
      (r.minTiers === null || tiers >= r.minTiers) &&
      (r.minServings === null || servings >= r.minServings) &&
      (r.requiresFinishSlug === null || chosenSlugs.includes(r.requiresFinishSlug)),
  )

  const baseHours = Math.max(size?.minLeadHours ?? 0, ...matching.map((r) => r.minLeadHours), 0)

  const extras = chosen
    .filter((o) => o.extraLeadHours > 0)
    .map((o) => ({ label: o.label, hours: o.extraLeadHours }))

  const maxAdvanceDays = matching.length
    ? Math.min(...matching.map((r) => r.maxAdvanceDays))
    : 180

  return {
    baseHours,
    extras,
    totalHours: baseHours + extras.reduce((sum, e) => sum + e.hours, 0),
    maxAdvanceDays,
  }
}

/**
 * The full engine. Steps 2–8 of PROMPT-07, in that exact order.
 */
export function computeAvailability(
  data: EngineData,
  query: EngineQuery,
): AvailabilityResponse {
  const breakdown = computeRequiredLeadHours(data, query)

  // 2 — the earliest legal instant.
  const earliestLegal = new Date(query.now.getTime() + breakdown.totalHours * 3_600_000)

  // 3 — the max advance window, as a business date.
  //
  // Measured from TODAY, not from the start of the queried window. "How
  // far ahead can I book" is a question about now; paging the calendar
  // forward must not extend the ceiling.
  const lastBookable = addBusinessDays(businessDate(query.now), breakdown.maxAdvanceDays)

  const dates: DateResult[] = []

  for (let i = 0; i < query.days; i++) {
    const date = addBusinessDays(query.fromDate, i)
    const reasons: UnavailableReason[] = []

    // 4 — blackout dates.
    if (data.blackoutDates.includes(date)) {
      dates.push({ date, slots: [], reasons: [{ code: 'blackout' }] })
      continue
    }

    if (date > lastBookable) {
      dates.push({
        date,
        slots: [],
        reasons: [{ code: 'tooFar', maxAdvanceDays: breakdown.maxAdvanceDays }],
      })
      continue
    }

    // 5 — closed days. A pickup is never offered on a day the door is shut.
    const dow = dowOf(date)
    const hours = data.openingHours.find((h) => h.dow === dow)
    if (!hours) {
      dates.push({ date, slots: [], reasons: [{ code: 'closed' }] })
      continue
    }

    const capacity = data.capacityRules.find(
      (c) => c.appliesTo === query.orderType && c.dow === dow,
    )
    if (!capacity) {
      dates.push({ date, slots: [], reasons: [{ code: 'closed' }] })
      continue
    }

    // 6 — generate slots, clipped to the real opening hours for that date.
    const start = Math.max(mins(capacity.windowStart), mins(hours.opensAt))
    const end = Math.min(mins(capacity.windowEnd), mins(hours.closesAt))

    const slots: SlotResult[] = []
    for (let m = start; m + capacity.slotMinutes <= end; m += capacity.slotMinutes) {
      const startsAt = hhmm(m)
      // The one conversion. Wall-clock in Richmond -> the true instant.
      const utc = localToUtc(date, startsAt)
      const slotEnd = new Date(utc.getTime() + capacity.slotMinutes * 60_000)

      // 7 — subtract booked capacity.
      const taken = data.booked.filter((b) => {
        if (b.orderType !== query.orderType) return false
        const at = new Date(b.pickupAt).getTime()
        return at >= utc.getTime() && at < slotEnd.getTime()
      }).length

      const remaining = Math.max(0, capacity.maxPerSlot - taken)

      // 8 — drop anything before the earliest legal instant, including
      // partial days. Earliest legal Thursday 15:20 kills Thursday 09:00
      // through 15:00 and leaves 16:00 onward standing.
      const afterLead = utc.getTime() >= earliestLegal.getTime()

      slots.push({
        startsAt,
        startsAtUtc: utc.toISOString(),
        remaining,
        isAvailable: remaining > 0 && afterLead,
      })
    }

    const bookable = slots.filter((s) => s.isAvailable)
    if (bookable.length === 0) {
      // Say WHY. Lead time and "everything is taken" are different
      // problems and the customer can act on exactly one of them.
      const anyAfterLead = slots.some(
        (s) => new Date(s.startsAtUtc).getTime() >= earliestLegal.getTime(),
      )
      reasons.push(
        anyAfterLead
          ? { code: 'full' }
          : {
              code: 'lead',
              hours: breakdown.totalHours,
              days: Math.ceil(breakdown.totalHours / 24),
            },
      )
    }

    dates.push({ date, slots, reasons })
  }

  return {
    requiredLeadHours: breakdown.totalHours,
    earliestLegal: earliestLegal.toISOString(),
    breakdown,
    dates,
  }
}

/**
 * Server-side price recomputation.
 *
 * NEVER trust a client price, total or deposit. The configurator sends
 * its selections; this recomputes the money from `cake_sizes.base_price`
 * and `cake_options.price_delta`, and that result is what gets charged.
 */
export function computeCakePrice({
  sizes,
  options,
  sizeId,
  optionSlugs,
  taxRate,
  depositPct,
}: {
  sizes: CakeSize[]
  options: CakeOption[]
  sizeId: string
  optionSlugs: string[]
  taxRate: number
  depositPct: number
}) {
  const size = sizes.find((s) => s.id === sizeId)
  if (!size) throw new Error(`Unknown cake size ${sizeId}`)

  const chosen = options.filter((o) => optionSlugs.includes(o.slug))

  const lines = [
    { label: size.label, cents: size.basePriceCents },
    ...chosen
      .filter((o) => o.priceDeltaCents !== 0)
      .map((o) => ({ label: o.label, cents: o.priceDeltaCents })),
  ]

  const subtotalCents = lines.reduce((sum, l) => sum + l.cents, 0)
  const taxCents = Math.round(subtotalCents * taxRate)
  const totalCents = subtotalCents + taxCents
  const depositCents = Math.round(totalCents * (depositPct / 100))

  return { lines, subtotalCents, taxCents, totalCents, depositCents }
}
