import { db } from '@/lib/data'
import { addBusinessDays, businessDate } from '@/lib/datetime'
import type { MarginRow } from '@/lib/data/types'

/**
 * The costing screens' data layer.
 *
 * Every figure here comes out of `recipe_cost()` / `variant_food_cost()`
 * through the data layer. NOTHING in this file re-derives a food cost —
 * two implementations of the same formula drift, and the one the owner
 * sees would stop being the one the reports use.
 */

export type MarginStatus = 'ok' | 'thin_margin' | 'sold_at_loss' | 'no_recipe'

export interface CostedRow extends MarginRow {
  status: MarginStatus
  /** Price minus food cost, in cents. Null without a recipe. */
  contributionCents: number | null
  unitsSold: number
}

/**
 * A missing recipe is `no_recipe` — never a $0 cost and never a 100%
 * margin. A product nobody has costed must not read as the most
 * profitable thing on the menu.
 */
export function statusFor(row: MarginRow): MarginStatus {
  if (row.foodCost === null) return 'no_recipe'
  const costCents = Math.round(row.foodCost * 100)
  if (costCents >= row.priceCents) return 'sold_at_loss'
  if ((row.marginPct ?? 0) < 60) return 'thin_margin'
  return 'ok'
}

/** `sold_at_loss` and `no_recipe` sort to the top. Those are the rows that matter. */
const STATUS_RANK: Record<MarginStatus, number> = {
  sold_at_loss: 0,
  no_recipe: 1,
  thin_margin: 2,
  ok: 3,
}

export async function getCostedCatalog(): Promise<CostedRow[]> {
  const today = businessDate(new Date())
  const [rows, volume] = await Promise.all([
    db.getMarginTable(),
    db.getVariantVolume(addBusinessDays(today, -30), today),
  ])

  return rows
    .map((row) => ({
      ...row,
      status: statusFor(row),
      contributionCents:
        row.foodCost === null ? null : row.priceCents - Math.round(row.foodCost * 100),
      unitsSold: volume[row.variantId] ?? 0,
    }))
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      return rank !== 0 ? rank : a.name.localeCompare(b.name)
    })
}

export interface CatalogSummary {
  averageMarginPct: number | null
  /** Weighted by units actually sold — the honest one. */
  weightedMarginPct: number | null
  soldAtLossCount: number
  noRecipeCount: number
  withRecipeCount: number
  totalCount: number
  /** Best by margin %, and best by total contribution. Rarely the same. */
  bestByMargin: CostedRow | null
  bestByContribution: CostedRow | null
}

export function summarize(rows: CostedRow[]): CatalogSummary {
  const costed = rows.filter((r) => r.foodCost !== null && r.marginPct !== null)

  const average = costed.length
    ? costed.reduce((s, r) => s + (r.marginPct as number), 0) / costed.length
    : null

  // Weighted by 30-day volume, not a simple mean. A 90%-margin item that
  // sells twice a week does not represent the business.
  const soldUnits = costed.reduce((s, r) => s + r.unitsSold, 0)
  const weighted = soldUnits
    ? costed.reduce((s, r) => s + (r.marginPct as number) * r.unitsSold, 0) / soldUnits
    : null

  const byMargin = [...costed].sort((a, b) => (b.marginPct as number) - (a.marginPct as number))
  const byContribution = [...costed].sort(
    (a, b) =>
      (b.contributionCents as number) * b.unitsSold -
      (a.contributionCents as number) * a.unitsSold,
  )

  return {
    averageMarginPct: average,
    weightedMarginPct: weighted,
    soldAtLossCount: rows.filter((r) => r.status === 'sold_at_loss').length,
    noRecipeCount: rows.filter((r) => r.status === 'no_recipe').length,
    withRecipeCount: rows.length - rows.filter((r) => r.status === 'no_recipe').length,
    totalCount: rows.length,
    bestByMargin: byMargin[0] ?? null,
    bestByContribution: byContribution[0] ?? null,
  }
}

export interface SimRow {
  variantId: string
  name: string
  sku: string
  priceCents: number
  beforeCost: number | null
  afterCost: number | null
  beforeMarginPct: number | null
  afterMarginPct: number | null
  /** The price that would hold the ORIGINAL margin at the new cost. */
  priceToHoldMarginCents: number | null
}

/**
 * Ingredient shock. Writes nothing — `db.simulate` re-costs a cloned
 * book and throws the clone away.
 */
export async function simulateIngredientShock(
  deltas: Record<string, number>,
): Promise<SimRow[]> {
  const [before, after] = await Promise.all([
    db.getMarginTable(),
    db.simulate({ ingredientDeltaPct: deltas }),
  ])

  return before
    .map((b): SimRow | null => {
      const a = after.find((x) => x.variantId === b.variantId)
      if (!a || a.foodCost === b.foodCost) return null

      // To hold the old margin m at the new cost c: price = c / (1 - m).
      const m = (b.marginPct ?? 0) / 100
      const priceToHold =
        a.foodCost !== null && m < 1 ? Math.ceil((a.foodCost / (1 - m)) * 100) : null

      return {
        variantId: b.variantId,
        name: b.name,
        sku: b.sku,
        priceCents: b.priceCents,
        beforeCost: b.foodCost,
        afterCost: a.foodCost,
        beforeMarginPct: b.marginPct,
        afterMarginPct: a.marginPct,
        priceToHoldMarginCents: priceToHold,
      }
    })
    .filter((r): r is SimRow => r !== null)
}

/** Price change. Also writes nothing. */
export async function simulatePriceChange(
  prices: Record<string, number>,
): Promise<SimRow[]> {
  const [before, after] = await Promise.all([
    db.getMarginTable(),
    db.simulate({ priceCents: prices }),
  ])

  return Object.keys(prices)
    .map((variantId): SimRow | null => {
      const b = before.find((x) => x.variantId === variantId)
      const a = after.find((x) => x.variantId === variantId)
      if (!b || !a) return null
      return {
        variantId,
        name: b.name,
        sku: b.sku,
        priceCents: a.priceCents,
        beforeCost: b.foodCost,
        afterCost: a.foodCost,
        beforeMarginPct: b.marginPct,
        afterMarginPct: a.marginPct,
        priceToHoldMarginCents: null,
      }
    })
    .filter((r): r is SimRow => r !== null)
}
