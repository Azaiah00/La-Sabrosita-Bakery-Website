// DEMO ONLY. Mirrors recipe_cost() / variant_food_cost() from
// 0001_schema.sql. The database is the source of truth in production —
// this exists so the demo runs with no database at all.
// Verified reference values (must match, see CLAUDE.md):
//   sugar-shell sub-recipe batch = 3.9400
//   concha batch (yields 48)     = 18.9277
//   concha per unit              = 0.3943  (margin 77.47%)
//   butter 0.0095 -> 0.0190      = 0.5765
//
// If this file and the SQL ever disagree, THIS FILE IS WRONG. Do not
// adjust the expected values to match the port — see the reference table
// in CLAUDE.md. `costing.test.ts` asserts all four numbers.

import type { RawFixtures } from './fixtures'

/**
 * Postgres `round(numeric, n)` — half away from zero.
 *
 * JS `Math.round` is half-UP, which differs for negatives, and naive
 * `Math.round(x * 10 ** n)` loses to binary representation on values like
 * 1.005. Scaling through a decimal string avoids both.
 */
export function roundTo(value: number, dp: number): number {
  if (!Number.isFinite(value)) return value
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) * 10 ** dp
  // The epsilon nudge only matters when the true decimal value sits exactly
  // on .5 and binary representation has landed a hair below it.
  const rounded = Math.round(scaled + (scaled % 1 === 0.5 ? 0 : Number.EPSILON * scaled))
  return (sign * rounded) / 10 ** dp
}

/** numeric(14,6) — the accumulator type inside recipe_cost(). */
const num6 = (n: number) => roundTo(n, 6)

export class UnitConversionError extends Error {
  /** Matches the SQLSTATE the SQL function raises. */
  readonly code = '22023'
  constructor(from: string, to: string) {
    super(`No unit conversion between ${from} and ${to}`)
    this.name = 'UnitConversionError'
  }
}

export class RecipeCycleError extends Error {
  readonly code = '22023'
  constructor(recipeId: string) {
    super(`Recipe nesting deeper than 10 levels — probable cycle at ${recipeId}`)
    this.name = 'RecipeCycleError'
  }
}

/**
 * The costing book: everything `recipe_cost()` reads, indexed once.
 *
 * Ingredient costs live here rather than in the fixtures so the admin's
 * "what if butter doubles?" control has one place to write to and every
 * margin recomputes off it.
 */
export interface CostingBook {
  /** `${fromUnitId}>${toUnitId}` -> factor */
  conversions: Map<string, number>
  ingredients: Map<string, { stockUnitId: string; lastUnitCost: number }>
  recipes: Map<
    string,
    {
      id: string
      variantId: string | null
      yieldQty: number
      items: {
        ingredientId: string | null
        subRecipeId: string | null
        qty: number
        unitId: string
      }[]
    }
  >
  /** variant_id -> recipe_id, for the active recipe only. */
  recipeByVariant: Map<string, string>
}

export function buildCostingBook(f: RawFixtures): CostingBook {
  const conversions = new Map<string, number>()
  for (const c of f.unit_conversions) {
    conversions.set(`${c.from_unit_id}>${c.to_unit_id}`, c.factor)
  }

  const ingredients = new Map<string, { stockUnitId: string; lastUnitCost: number }>()
  for (const i of f.ingredients) {
    ingredients.set(i.id, { stockUnitId: i.stock_unit_id, lastUnitCost: i.last_unit_cost })
  }

  const recipes: CostingBook['recipes'] = new Map()
  for (const r of f.recipes) {
    recipes.set(r.id, {
      id: r.id,
      variantId: r.variant_id,
      yieldQty: r.yield_qty,
      items: [],
    })
  }
  for (const ri of f.recipe_items) {
    const r = recipes.get(ri.recipe_id)
    if (!r) continue
    r.items.push({
      ingredientId: ri.ingredient_id,
      subRecipeId: ri.sub_recipe_id,
      qty: ri.qty,
      unitId: ri.unit_id,
    })
  }

  const recipeByVariant = new Map<string, string>()
  for (const r of recipes.values()) {
    if (r.variantId) recipeByVariant.set(r.variantId, r.id)
  }

  return { conversions, ingredients, recipes, recipeByVariant }
}

/**
 * convert_qty(). Direct, inverse, or same-unit.
 * Raises if no conversion path exists — silence here would corrupt food cost.
 */
export function convertQty(book: CostingBook, qty: number, from: string, to: string): number {
  if (from === to) return qty

  const direct = book.conversions.get(`${from}>${to}`)
  if (direct !== undefined) return qty * direct

  const inverse = book.conversions.get(`${to}>${from}`)
  if (inverse !== undefined) return qty / inverse

  throw new UnitConversionError(from, to)
}

/**
 * recipe_cost(). Recursive, including sub-recipes.
 * `depth` guards against a cycle slipping past the no-self-reference check.
 */
export function recipeCost(book: CostingBook, recipeId: string, depth = 0): number {
  if (depth > 10) throw new RecipeCycleError(recipeId)

  const recipe = book.recipes.get(recipeId)
  if (!recipe) throw new Error(`Unknown recipe ${recipeId}`)

  // numeric(14,6) accumulator, exactly as the SQL declares it.
  let total = 0

  for (const item of recipe.items) {
    if (item.ingredientId !== null) {
      const ing = book.ingredients.get(item.ingredientId)
      if (!ing) throw new Error(`Unknown ingredient ${item.ingredientId}`)
      total = num6(
        total + convertQty(book, item.qty, item.unitId, ing.stockUnitId) * ing.lastUnitCost,
      )
    } else {
      const subId = item.subRecipeId!
      const sub = book.recipes.get(subId)
      if (!sub || !sub.yieldQty) {
        const e = new Error(`Sub-recipe ${subId} has no usable yield`) as Error & { code: string }
        e.code = '22023'
        throw e
      }
      total = num6(total + (recipeCost(book, subId, depth + 1) / sub.yieldQty) * item.qty)
    }
  }

  return roundTo(total, 4)
}

/** variant_food_cost(). Cost of one unit of what the recipe yields. */
export function variantFoodCost(book: CostingBook, variantId: string): number | null {
  const recipeId = book.recipeByVariant.get(variantId)
  if (!recipeId) return null
  const recipe = book.recipes.get(recipeId)
  if (!recipe || !recipe.yieldQty) return null
  return roundTo(recipeCost(book, recipeId) / recipe.yieldQty, 4)
}

/**
 * Gross margin as a percentage of the selling price.
 *
 * Takes the price in integer cents (the app's money unit) and the food
 * cost in decimal dollars (numeric(12,4), sub-cent by nature). Returns 2 dp.
 */
export function marginPct(priceCents: number, foodCost: number | null): number | null {
  if (foodCost === null || priceCents <= 0) return null
  const price = priceCents / 100
  return roundTo(((price - foodCost) / price) * 100, 2)
}
