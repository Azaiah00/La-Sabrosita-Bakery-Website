'use server'

import { simulateIngredientShock, type SimRow } from '@/lib/admin/costing'

/**
 * Run an ingredient shock.
 *
 * This is a READ. It re-costs a cloned book and returns the result; the
 * store is never touched, so `last_unit_cost` and `price` are unchanged
 * afterwards. There is a test that proves it.
 */
export async function runIngredientShock(
  deltas: Record<string, number>,
): Promise<SimRow[]> {
  const clean: Record<string, number> = {}
  for (const [id, pct] of Object.entries(deltas)) {
    // A -100% ingredient is free and a +1000% one is a typo, not a scenario.
    if (Number.isFinite(pct) && pct > -100 && pct <= 300) clean[id] = pct
  }
  if (!Object.keys(clean).length) return []
  return simulateIngredientShock(clean)
}
