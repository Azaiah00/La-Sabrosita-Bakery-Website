import { db } from '@/lib/data'

export interface Shortfall {
  ingredientId: string
  name: string
  unitCode: string
  needed: number
  onHand: number
  gap: number
}

/**
 * Will tomorrow's plan actually run?
 *
 * Walks the planned batches through each recipe's bill of materials and
 * compares the draw against derived on-hand. Anything short comes back
 * with the gap named, so the banner can say "you're 4.2 lb of butter
 * short" rather than "check inventory".
 *
 * On-hand is the sum of the ledger — never a stored column — so this is
 * only ever as good as the ledger, which is the honest situation.
 */
export async function ingredientShortfall(date: string): Promise<Shortfall[]> {
  const [plan, recipes, ingredients] = await Promise.all([
    db.getProductionPlan(date),
    db.getRecipes(),
    db.getIngredients(),
  ])

  /** ingredient id -> quantity needed, in that ingredient's stock unit. */
  const needed = new Map<string, number>()

  const addRecipeDraw = (recipeId: string, batches: number) => {
    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) return

    for (const item of recipe.items) {
      if (item.subRecipeId) {
        const sub = recipes.find((r) => r.id === item.subRecipeId)
        if (sub?.yieldQty) {
          // A sub-recipe line draws its own ingredients, scaled by how
          // much of the sub the parent actually consumes.
          addRecipeDraw(item.subRecipeId, (item.qty / sub.yieldQty) * batches)
        }
        continue
      }
      if (!item.ingredientId) continue
      needed.set(item.ingredientId, (needed.get(item.ingredientId) ?? 0) + item.qty * batches)
    }
  }

  for (const row of plan) {
    if (!row.recipeId) continue
    const recipe = recipes.find((r) => r.id === row.recipeId)
    if (!recipe?.yieldQty) continue
    // Whole batches — you cannot bake two-thirds of a tray.
    addRecipeDraw(row.recipeId, Math.ceil(row.qtyNeeded / recipe.yieldQty))
  }

  const out: Shortfall[] = []
  for (const [ingredientId, qty] of needed) {
    const ing = ingredients.find((i) => i.id === ingredientId)
    if (!ing) continue
    if (ing.onHand >= qty) continue
    out.push({
      ingredientId,
      name: ing.name,
      unitCode: ing.stockUnitCode,
      needed: qty,
      onHand: ing.onHand,
      gap: qty - ing.onHand,
    })
  }

  return out.sort((a, b) => b.gap - a.gap)
}
