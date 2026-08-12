/**
 * PROMPT-11 acceptance, run against the seeded data.
 *
 * The four reference values in CLAUDE.md are re-asserted here through
 * the ADMIN path (getMarginTable / getRecipeCost / getRecipeLineCosts),
 * not just through the costing unit — so a bug in the screen's data
 * layer cannot hide behind a passing engine test.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter as db } from '@/lib/data/demo'
import { store } from '@/lib/data/demo/store'
import { getCostedCatalog, summarize, statusFor, simulateIngredientShock } from './costing'

const CONCHA_VARIANT = 'd0000000-0000-0000-0000-000000000001'
const CONCHA_BATCH = 'f0000000-0000-0000-0000-000000000001'
const SUGAR_SHELL = 'f0000000-0000-0000-0000-000000000004'
const BUTTER = 'e0000000-0000-0000-0000-000000000003'
const OREJA_VARIANT = 'd0000000-0000-0000-0000-000000000006'

beforeEach(() => {
  store.reset()
})

describe('verified reference values, through the admin path', () => {
  it('costs the concha batch at 18.9277 and the sugar shell at 3.9400', async () => {
    expect(await db.getRecipeCost(CONCHA_BATCH)).toBe(18.9277)
    expect(await db.getRecipeCost(SUGAR_SHELL)).toBe(3.94)
  })

  it('shows per-unit 0.3943 and margin 77.47% on the margin table', async () => {
    const rows = await getCostedCatalog()
    const concha = rows.find((r) => r.variantId === CONCHA_VARIANT)!
    expect(concha.foodCost).toBe(0.3943)
    expect(concha.marginPct).toBe(77.47)
    expect(concha.status).toBe('ok')
  })

  it('divides the sub-recipe by its own yield — 960g of a 1200g batch = 3.152', async () => {
    // The step that is easy to miss. Getting it wrong would push the
    // whole batch cost from 18.9277 to 19.7157.
    const lines = await db.getRecipeLineCosts(CONCHA_BATCH)
    const shell = lines.find((l) => l.isSubRecipe)!
    expect(shell.costDollars).toBeCloseTo(3.152, 6)
  })

  it('adds every line back up to the batch total', async () => {
    const lines = await db.getRecipeLineCosts(CONCHA_BATCH)
    const sum = lines.reduce((s, l) => s + l.costDollars, 0)
    expect(sum).toBeCloseTo(18.9277, 3)
  })

  it('converts a pound line to grams — 1.5 lb of butter is 6.4637, not 0.014', async () => {
    const lines = await db.getRecipeLineCosts(CONCHA_BATCH)
    const butter = lines.find((l) => l.unitCode === 'lb')!
    expect(butter.costDollars).toBeCloseTo(6.4637, 3)
  })
})

describe('status classification', () => {
  it('never shows a missing recipe as a profitable product', async () => {
    const rows = await getCostedCatalog()
    const oreja = rows.find((r) => r.variantId === OREJA_VARIANT)!
    expect(oreja.foodCost).toBeNull()
    expect(oreja.marginPct).toBeNull()
    expect(oreja.status).toBe('no_recipe')
    // Not zero cost, and emphatically not 100% margin.
    expect(oreja.contributionCents).toBeNull()
  })

  it('flags sold_at_loss when cost exceeds price', () => {
    expect(
      statusFor({
        variantId: 'x',
        sku: 'X',
        name: 'X',
        priceCents: 30,
        foodCost: 0.4,
        marginPct: -33.33,
        isPriceProvisional: true,
      }),
    ).toBe('sold_at_loss')
  })

  it('flags thin_margin below 60%', () => {
    expect(
      statusFor({
        variantId: 'x',
        sku: 'X',
        name: 'X',
        priceCents: 100,
        foodCost: 0.5,
        marginPct: 50,
        isPriceProvisional: true,
      }),
    ).toBe('thin_margin')
  })

  it('pins sold_at_loss and no_recipe to the top', async () => {
    await db.setIngredientCost(BUTTER, 5) // absurd cost -> losses appear
    const rows = await getCostedCatalog()
    const firstOk = rows.findIndex((r) => r.status === 'ok')
    const lastBad = rows.map((r) => r.status).lastIndexOf('sold_at_loss')
    if (firstOk !== -1 && lastBad !== -1) expect(lastBad).toBeLessThan(firstOk)
  })
})

describe('weighted margin', () => {
  it('weights by units actually sold, not a simple mean', async () => {
    const rows = await getCostedCatalog()
    const s = summarize(rows)
    expect(s.averageMarginPct).not.toBeNull()
    expect(s.weightedMarginPct).not.toBeNull()
    // The seeded week sells conchas and tres leches in very different
    // quantities, so the two figures must not coincide.
    expect(s.weightedMarginPct).not.toBeCloseTo(s.averageMarginPct as number, 6)
  })

  it('counts products without a recipe rather than hiding them', async () => {
    const rows = await getCostedCatalog()
    const s = summarize(rows)
    expect(s.noRecipeCount).toBeGreaterThan(0)
    expect(s.withRecipeCount + s.noRecipeCount).toBe(s.totalCount)
  })
})

describe('the simulator', () => {
  it('doubles butter and moves the concha to 0.5765', async () => {
    // 0.0095 -> 0.0190 is +100%.
    const rows = await simulateIngredientShock({ [BUTTER]: 100 })
    const concha = rows.find((r) => r.variantId === CONCHA_VARIANT)!
    expect(concha.beforeCost).toBe(0.3943)
    expect(concha.afterCost).toBe(0.5765)
  })

  it('WRITES NOTHING — costs and prices are unchanged afterwards', async () => {
    const before = store.get().ingredients.find((i) => i.id === BUTTER)!.last_unit_cost
    const priceBefore = store.get().product_variants.find((v) => v.id === CONCHA_VARIANT)!.price

    await simulateIngredientShock({ [BUTTER]: 15 })

    expect(store.get().ingredients.find((i) => i.id === BUTTER)!.last_unit_cost).toBe(before)
    expect(store.get().product_variants.find((v) => v.id === CONCHA_VARIANT)!.price).toBe(
      priceBefore,
    )
    // And the live margin table is untouched.
    const rows = await db.getMarginTable()
    expect(rows.find((r) => r.variantId === CONCHA_VARIANT)!.foodCost).toBe(0.3943)
  })

  it('computes the price that holds the current margin', async () => {
    const rows = await simulateIngredientShock({ [BUTTER]: 15 })
    const concha = rows.find((r) => r.variantId === CONCHA_VARIANT)!
    // price = newCost / (1 - oldMargin)
    const expected = Math.ceil((concha.afterCost! / (1 - 0.7747)) * 100)
    expect(concha.priceToHoldMarginCents).toBe(expected)
    // And it is above the current price, since the cost went up.
    expect(concha.priceToHoldMarginCents!).toBeGreaterThan(concha.priceCents)
  })

  it('only reports products the change actually touched', async () => {
    const rows = await simulateIngredientShock({ [BUTTER]: 15 })
    // Butter is in the concha dough and the sugar shell and the
    // quesadilla — but not in a plain donut.
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.beforeCost !== r.afterCost)).toBe(true)
  })
})
