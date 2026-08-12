/**
 * The verified reference values from CLAUDE.md, executed against the
 * TypeScript port of recipe_cost() / variant_food_cost().
 *
 * These numbers came out of PostgreSQL 16.13 and were cross-checked by
 * hand. If a test here fails, the PORT is wrong — do not adjust the
 * expected value and do not adjust the seed.
 */
import { describe, it, expect } from 'vitest'
import { buildFixtures } from './fixtures'
import {
  buildCostingBook,
  convertQty,
  recipeCost,
  variantFoodCost,
  marginPct,
  UnitConversionError,
} from './costing'
import { toCents } from '@/lib/money'

const SUGAR_SHELL = 'f0000000-0000-0000-0000-000000000004'
const CONCHA_BATCH = 'f0000000-0000-0000-0000-000000000001'
const PAN_CONCHA = 'd0000000-0000-0000-0000-000000000001'
const BUTTER = 'e0000000-0000-0000-0000-000000000003'

const UNIT_G = 'a0000000-0000-0000-0000-000000000001'
const UNIT_LB = 'a0000000-0000-0000-0000-000000000003'
const UNIT_ML = 'a0000000-0000-0000-0000-000000000006'

// The fixture set is date-parameterised; costing does not depend on the
// date, so any fixed business date gives the same book.
const book = () => buildCostingBook(buildFixtures('2026-08-12'))

describe('convert_qty', () => {
  it('converts 1 lb to 453.59237 g', () => {
    expect(convertQty(book(), 1, UNIT_LB, UNIT_G)).toBeCloseTo(453.59237, 10)
  })

  it('returns the input unchanged for the same unit', () => {
    expect(convertQty(book(), 7.5, UNIT_G, UNIT_G)).toBe(7.5)
  })

  it('refuses to convert mass to volume', () => {
    // The SQL raises SQLSTATE 22023. Silence here would corrupt food cost.
    expect(() => convertQty(book(), 1, UNIT_G, UNIT_ML)).toThrow(UnitConversionError)
    try {
      convertQty(book(), 1, UNIT_G, UNIT_ML)
    } catch (e) {
      expect((e as UnitConversionError).code).toBe('22023')
    }
  })
})

describe('recipe_cost — verified reference values', () => {
  it('costs the sugar-shell sub-recipe at 3.9400', () => {
    expect(recipeCost(book(), SUGAR_SHELL)).toBe(3.94)
  })

  it('costs a concha batch (yields 48) at 18.9277', () => {
    expect(recipeCost(book(), CONCHA_BATCH)).toBe(18.9277)
  })
})

describe('variant_food_cost — verified reference values', () => {
  it('costs one concha at 0.3943', () => {
    expect(variantFoodCost(book(), PAN_CONCHA)).toBe(0.3943)
  })

  it('puts the concha margin at 77.47% against a $1.75 price', () => {
    const b = book()
    expect(marginPct(toCents(1.75), variantFoodCost(b, PAN_CONCHA))).toBe(77.47)
  })

  it('returns null for a variant with no recipe', () => {
    // PAN-OREJA has no recipe in the seed.
    expect(variantFoodCost(book(), 'd0000000-0000-0000-0000-000000000006')).toBeNull()
  })
})

describe('the ingredient-shock simulator', () => {
  it('moves the concha to 0.5765 when butter goes 0.0095 -> 0.0190', () => {
    const b = book()
    b.ingredients.get(BUTTER)!.lastUnitCost = 0.019
    expect(variantFoodCost(b, PAN_CONCHA)).toBe(0.5765)
  })

  it('re-costs the sub-recipe too, not just the direct line', () => {
    const b = book()
    b.ingredients.get(BUTTER)!.lastUnitCost = 0.019
    // 500g sugar + 300g butter + 400g flour, with butter doubled.
    expect(recipeCost(b, SUGAR_SHELL)).toBe(6.79)
  })
})
