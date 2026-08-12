/**
 * The availability engine. This is the part that must be right.
 *
 * The DST cases are the reason this file exists: a 10:00 AM pickup is
 * 10:00 AM local on BOTH sides of both changeover Sundays, and the
 * stored UTC instant differs by an hour between them. CLAUDE.md pins the
 * two reference conversions and they are asserted here directly.
 */
import { describe, it, expect } from 'vitest'
import {
  computeRequiredLeadHours,
  computeAvailability,
  computeCakePrice,
  type EngineData,
} from './availability'
import { localToUtc, formatLocal } from './datetime'
import { buildFixtures } from './data/demo/fixtures'
import { toCents } from './money'
import type { CakeOption, CakeOptionGroup, CakeSize, LeadTimeRule } from './data/types'

/* ---- Build engine data straight from the verified seed ------------- */

const f = buildFixtures('2026-08-12')

const sizes: CakeSize[] = f.cake_sizes.map((c) => ({
  id: c.id,
  label: c.label_es,
  servingsMin: c.servings_min,
  servingsMax: c.servings_max,
  basePriceCents: toCents(c.base_price),
  minLeadHours: c.min_lead_hours,
  maxTiers: c.max_tiers,
  sortOrder: c.sort_order,
}))

const options: CakeOption[] = f.cake_options.map((o) => ({
  id: `${o.option_group}:${o.slug}`,
  optionGroup: o.option_group as CakeOptionGroup,
  slug: o.slug,
  label: o.label_es,
  priceDeltaCents: toCents(o.price_delta),
  extraLeadHours: o.extra_lead_hours,
  sortOrder: o.sort_order,
}))

const rules: LeadTimeRule[] = f.lead_time_rules.map((r, i) => ({
  id: `lead:${i}`,
  appliesTo: r.applies_to as LeadTimeRule['appliesTo'],
  minTiers: r.min_tiers,
  minServings: r.min_servings,
  requiresFinishSlug: r.requires_finish_slug,
  minLeadHours: r.min_lead_hours,
  maxAdvanceDays: r.max_advance_days,
  priority: r.priority,
}))

const QUARTER = sizes.find((s) => s.label === '1/4 de plancha')!
const FULL_SHEET = sizes.find((s) => s.label === 'Plancha entera')!
const TWO_TIER = sizes.find((s) => s.label === '2 pisos')!

function engineData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    sizes,
    options,
    rules,
    blackoutDates: [],
    openingHours: f.opening_hours.map((h) => ({
      dow: h.dow,
      opensAt: h.opens_at,
      closesAt: h.closes_at,
    })),
    capacityRules: f.pickup_capacity_rules.map((c) => ({
      appliesTo: c.applies_to as EngineData['capacityRules'][number]['appliesTo'],
      dow: c.dow,
      windowStart: c.window_start,
      windowEnd: c.window_end,
      slotMinutes: c.slot_minutes,
      maxPerSlot: c.max_per_slot,
    })),
    booked: [],
    ...overrides,
  }
}

const lead = (q: Parameters<typeof computeRequiredLeadHours>[1]) =>
  computeRequiredLeadHours({ sizes, options, rules }, q)

/* ------------------------------------------------------------------ */

describe('computeRequiredLeadHours', () => {
  it('uses the size minimum when nothing else binds', () => {
    // Quarter sheet: 48h size minimum, serves 15-20 so the 60+ rule
    // does not apply, one tier so the 2-tier rule does not apply.
    expect(lead({ orderType: 'cake', sizeId: QUARTER.id, tiers: 1 }).totalHours).toBe(48)
  })

  it('takes the MAX of matching rules, never the first and never the sum', () => {
    // Full sheet serves 60-80, so the "60 or more servings" rule (72h)
    // binds over the base cake rule (48h). Summing would give 120.
    const r = lead({ orderType: 'cake', sizeId: FULL_SHEET.id, tiers: 1 })
    expect(r.baseHours).toBe(72)
    expect(r.totalHours).toBe(72)
  })

  it('applies the two-tier rule', () => {
    expect(lead({ orderType: 'cake', sizeId: TWO_TIER.id, tiers: 2 }).totalHours).toBe(168)
  })

  it('adds fondant on top of the binding minimum', () => {
    // Fondant is +72 extra hours, not a 72-hour floor.
    const r = lead({ orderType: 'cake', sizeId: QUARTER.id, tiers: 1, optionSlugs: ['fondant'] })
    expect(r.baseHours).toBe(48)
    expect(r.totalHours).toBe(120)
  })

  it('applies the edible-photo RULE and its extra hours', () => {
    // 'foto' both triggers a 72h rule and adds 24 extra hours.
    const r = lead({ orderType: 'cake', sizeId: QUARTER.id, tiers: 1, optionSlugs: ['foto'] })
    expect(r.baseHours).toBe(72)
    expect(r.totalHours).toBe(96)
  })

  it('gives 264 hours for 2-tier + fondant + edible photo', () => {
    // The worked example in PROMPT-07:
    //   max(size 168, 2-tier rule 168, photo rule 72, base 48) = 168
    //   + fondant 72 + photo 24 = 264
    const r = lead({
      orderType: 'cake',
      sizeId: TWO_TIER.id,
      tiers: 2,
      optionSlugs: ['fondant', 'foto'],
    })
    expect(r.baseHours).toBe(168)
    expect(r.totalHours).toBe(264)
  })

  it('lets a size minimum exceed every rule', () => {
    const huge: CakeSize = { ...QUARTER, id: 'huge', minLeadHours: 500 }
    const r = computeRequiredLeadHours(
      { sizes: [...sizes, huge], options, rules },
      { orderType: 'cake', sizeId: 'huge', tiers: 1 },
    )
    expect(r.totalHours).toBe(500)
  })

  it('takes the MINIMUM max-advance across matching rules', () => {
    // The 2-tier rule allows 365 days; the base cake rule allows 180.
    expect(lead({ orderType: 'cake', sizeId: TWO_TIER.id, tiers: 2 }).maxAdvanceDays).toBe(180)
  })
})

describe('DST — the reference conversions from CLAUDE.md', () => {
  it('stores 10:00 local on 2026-10-31 as 14:00Z', () => {
    expect(localToUtc('2026-10-31', '10:00').toISOString()).toBe('2026-10-31T14:00:00.000Z')
  })

  it('stores 10:00 local on 2026-11-02 as 15:00Z', () => {
    expect(localToUtc('2026-11-02', '10:00').toISOString()).toBe('2026-11-02T15:00:00.000Z')
  })
})

describe('slot generation across the DST fall-back Sunday', () => {
  // 2026-11-01 is the first Sunday in November — clocks fall back.
  const around = computeAvailability(engineData(), {
    orderType: 'cake',
    now: new Date('2026-10-01T12:00:00Z'),
    fromDate: '2026-10-31',
    days: 3,
  })

  it('offers a 10:00 slot on every day, before and after the change', () => {
    for (const date of ['2026-10-31', '2026-11-01', '2026-11-02']) {
      const day = around.dates.find((d) => d.date === date)!
      const ten = day.slots.find((s) => s.startsAt === '10:00')
      expect(ten, `no 10:00 slot on ${date}`).toBeDefined()
      // The whole point: 10:00 local reads back as 10:00 local.
      expect(formatLocal(new Date(ten!.startsAtUtc), 'HH:mm')).toBe('10:00')
    }
  })

  it('shifts the stored instant by an hour across the boundary', () => {
    const before = around.dates.find((d) => d.date === '2026-10-31')!
    const after = around.dates.find((d) => d.date === '2026-11-02')!
    expect(before.slots.find((s) => s.startsAt === '10:00')!.startsAtUtc).toBe(
      '2026-10-31T14:00:00.000Z',
    )
    expect(after.slots.find((s) => s.startsAt === '10:00')!.startsAtUtc).toBe(
      '2026-11-02T15:00:00.000Z',
    )
  })
})

describe('slot generation across the spring-forward Sunday', () => {
  // 2026-03-08 is the second Sunday in March — clocks spring forward.
  const around = computeAvailability(engineData(), {
    orderType: 'cake',
    now: new Date('2026-02-01T12:00:00Z'),
    fromDate: '2026-03-07',
    days: 3,
  })

  it('keeps 10:00 local on both sides', () => {
    for (const date of ['2026-03-07', '2026-03-08', '2026-03-09']) {
      const ten = around.dates.find((d) => d.date === date)!.slots.find((s) => s.startsAt === '10:00')
      expect(ten, `no 10:00 slot on ${date}`).toBeDefined()
      expect(formatLocal(new Date(ten!.startsAtUtc), 'HH:mm')).toBe('10:00')
    }
  })

  it('shifts the stored instant by an hour across the boundary', () => {
    const before = around.dates.find((d) => d.date === '2026-03-07')!
    const after = around.dates.find((d) => d.date === '2026-03-09')!
    expect(before.slots.find((s) => s.startsAt === '10:00')!.startsAtUtc).toBe(
      '2026-03-07T15:00:00.000Z',
    )
    expect(after.slots.find((s) => s.startsAt === '10:00')!.startsAtUtc).toBe(
      '2026-03-09T14:00:00.000Z',
    )
  })
})

describe('exclusions', () => {
  it('removes a blackout date and says why', () => {
    const result = computeAvailability(engineData({ blackoutDates: ['2026-05-10'] }), {
      orderType: 'cake',
      now: new Date('2026-01-01T12:00:00Z'),
      fromDate: '2026-05-09',
      days: 3,
    })
    const blacked = result.dates.find((d) => d.date === '2026-05-10')!
    expect(blacked.slots).toHaveLength(0)
    expect(blacked.reasons).toEqual([{ code: 'blackout' }])
  })

  it('never produces a slot on a closed day', () => {
    // Drop Sunday from the opening hours entirely.
    const data = engineData()
    data.openingHours = data.openingHours.filter((h) => h.dow !== 0)

    const result = computeAvailability(data, {
      orderType: 'cake',
      now: new Date('2026-01-01T12:00:00Z'),
      fromDate: '2026-05-10', // a Sunday
      days: 1,
    })
    expect(result.dates[0].slots).toHaveLength(0)
    expect(result.dates[0].reasons).toEqual([{ code: 'closed' }])
  })

  it('drops only the slots before the earliest legal instant, not the whole day', () => {
    // 48h from Tue 19:20Z lands Thu 19:20Z = Thu 15:20 local.
    const result = computeAvailability(engineData(), {
      orderType: 'cake',
      now: new Date('2026-08-11T19:20:00Z'),
      fromDate: '2026-08-13',
      days: 1,
      sizeId: QUARTER.id,
      tiers: 1,
    })
    const day = result.dates[0]
    expect(day.slots.find((s) => s.startsAt === '15:00')!.isAvailable).toBe(false)
    expect(day.slots.find((s) => s.startsAt === '16:00')!.isAvailable).toBe(true)
  })

  it('reports a full day as full, not as a lead-time problem', () => {
    // Fill every cake slot on the date: 4 per slot, 09:00-18:00 hourly.
    const booked = []
    for (let h = 9; h < 18; h++) {
      for (let i = 0; i < 4; i++) {
        booked.push({
          orderType: 'cake' as const,
          pickupAt: localToUtc('2026-09-10', `${String(h).padStart(2, '0')}:00`).toISOString(),
        })
      }
    }
    const result = computeAvailability(engineData({ booked }), {
      orderType: 'cake',
      now: new Date('2026-08-01T12:00:00Z'),
      fromDate: '2026-09-10',
      days: 1,
      sizeId: QUARTER.id,
    })
    expect(result.dates[0].reasons).toEqual([{ code: 'full' }])
  })

  it('rejects a date beyond the max advance window', () => {
    // Inside the window: four days out, well past the 48h lead.
    const near = computeAvailability(engineData(), {
      orderType: 'cake',
      now: new Date('2026-08-01T12:00:00Z'),
      fromDate: '2026-08-05',
      days: 1,
      sizeId: QUARTER.id,
    })
    expect(near.dates[0].reasons).toEqual([])

    // A year out: past the 180-day ceiling for a plain cake.
    const far = computeAvailability(engineData(), {
      orderType: 'cake',
      now: new Date('2026-08-01T12:00:00Z'),
      fromDate: '2027-08-01',
      days: 1,
      sizeId: QUARTER.id,
    })
    expect(far.dates[0].reasons[0]).toEqual({ code: 'tooFar', maxAdvanceDays: 180 })
  })

  it('measures the advance ceiling from today, not from the queried window', () => {
    // Paging the calendar forward must not extend how far ahead you can
    // book. Both queries share a `now`, so both see the same ceiling.
    const paged = computeAvailability(engineData(), {
      orderType: 'cake',
      now: new Date('2026-08-01T12:00:00Z'),
      fromDate: '2027-06-01',
      days: 1,
      sizeId: QUARTER.id,
    })
    expect(paged.dates[0].reasons[0]).toEqual({ code: 'tooFar', maxAdvanceDays: 180 })
  })
})

describe('server-side price recomputation', () => {
  it('builds the total from the size and the option deltas', () => {
    const price = computeCakePrice({
      sizes,
      options,
      sizeId: TWO_TIER.id,
      optionSlugs: ['tres-leches', 'guayaba', 'fondant', 'flores'],
      taxRate: 0.06,
      depositPct: 30,
    })
    // 195.00 + guayaba 5 + fondant 35 + flores 15 = 250.00
    expect(price.subtotalCents).toBe(25000)
    expect(price.taxCents).toBe(1500)
    expect(price.totalCents).toBe(26500)
    expect(price.depositCents).toBe(7950)
  })

  it('ignores options that were not selected', () => {
    const price = computeCakePrice({
      sizes,
      options,
      sizeId: QUARTER.id,
      optionSlugs: [],
      taxRate: 0.06,
      depositPct: 30,
    })
    expect(price.subtotalCents).toBe(4500)
  })
})
