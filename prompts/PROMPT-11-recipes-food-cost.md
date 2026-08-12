# PROMPT 11 — Admin: recipes, bill of materials, food cost and margin

> Requires PROMPT 01–10. This is the screen that sells the retainer.

---

## Goal

Every product maps to its ingredients at yield. Change the price of butter once, and every product's food cost and margin re-computes across the whole catalog. Show the owner, in plain Spanish, which items make money and which do not.

Nine out of ten independent bakeries are selling at least one item at a loss and do not know which one. This is the screen that tells them.

## Files to create

```
src/app/admin/recetas/page.tsx
src/app/admin/recetas/[id]/page.tsx
src/app/admin/recetas/nueva/page.tsx
src/app/admin/costos/page.tsx
src/app/admin/costos/simulador/page.tsx
src/components/admin/recipe-builder.tsx
src/components/admin/recipe-line.tsx
src/components/admin/cost-breakdown.tsx
src/components/admin/margin-table.tsx
src/components/admin/price-simulator.tsx
src/lib/admin/costing.ts
src/app/actions/recipes.ts
```

---

## `/admin/recetas` — Recipe list

Every recipe with its linked product variant, yield, computed batch cost, cost per unit, and a status chip:

- `ok` — margin ≥ 60%
- `thin_margin` — margin below 60%, `--warn`
- `sold_at_loss` — cost exceeds price, `--danger`
- `no_recipe` — a variant with no recipe at all, `--info`

**Pin `sold_at_loss` and `no_recipe` to the top.** Those are the rows that matter.

A prominent counter in the header: *"12 de 24 productos tienen receta"* — because the honest answer on day one is that most do not, and the system should say so rather than imply completeness.

## `/admin/recetas/[id]` — Recipe builder

### Header
Bilingual name, linked product variant (or "sub-receta" if none), yield quantity and unit, labor minutes.

### Lines — `recipe-line.tsx`

Each line is either an **ingredient** or a **sub-recipe** (the schema's `recipe_items` check constraint enforces exactly one).

```
[ Harina de trigo    ▾ ]  [ 3000 ] [ g  ▾ ]   $3.30   17.4%   [×]
[ Mantequilla        ▾ ]  [  1.5 ] [ lb ▾ ]   $6.46   34.2%   [×]
[ ↳ Costra de azúcar ▾ ]  [  960 ] [ g  ▾ ]   $3.15   16.7%   [×]
```

- The unit selector offers only units with a conversion path to the ingredient's stock unit. If a path is missing, the line shows an inline "create conversion" affordance rather than saving a wrong number.
- Cost per line and its share of the batch update live as you type.
- Sub-recipe lines are visually indented with a `↳` and expand inline to show their own composition.
- Reorderable by drag, with a keyboard alternative (move up / move down buttons) — drag-only reordering is an accessibility failure.

### Cost breakdown — `cost-breakdown.tsx`

```
Costo del lote (48 unidades)      $18.9277
Costo por unidad                   $0.3943
Precio de venta                    $1.7500
Margen de contribución             $1.3557
Margen                              77.47%
```

Plus a horizontal bar showing each ingredient's share of cost, and the labor minutes converted to a labor cost per unit using the rate from `settings`.

> **Reference values — verified.** Against the seeded demo data, the concha recipe yields exactly these figures: sugar-shell sub-recipe batch **$3.9400**, concha batch **$18.9277**, per-unit **$0.3943**, margin **77.47%**. These were confirmed by executing the SQL and by an independent hand calculation. If your implementation produces different numbers from the same seed, your implementation is wrong — do not adjust the seed to match it.

### Sub-recipes

A recipe with `variant_id = null` is a sub-recipe. Its cost is divided by its own yield before being multiplied into the parent line quantity. The `recipe_cost()` function already does this and guards nesting past 10 levels; the UI must surface that error legibly rather than as a 500.

Deleting a sub-recipe used by another recipe is blocked by the FK — show *"Se usa en 3 recetas"* with links.

---

## `/admin/costos` — The margin table

The whole catalog, from `v_variant_margin`, sortable on every column.

| Producto | Precio | Costo | Margen $ | Margen % | Estado |
|---|---|---|---|---|---|
| Quesadilla entera | $13.99 | $4.1054 | $9.88 | 70.65% | ok |
| Concha | $1.75 | $0.3943 | $1.36 | 77.47% | ok |
| Tres leches porción | $5.99 | $0.7015 | $5.29 | 88.29% | ok |

Header tiles: average margin, weighted average margin (weighted by units sold over the last 30 days — the honest one), count sold at a loss, count with no recipe, and total food cost as a share of sales.

**Best and worst by two different measures, side by side:** best by margin % and best by total contribution. They are rarely the same item, and an owner who only optimizes margin % will kill their volume driver. Say so on the screen, in one line.

Export to CSV.

---

## `/admin/costos/simulador` — Price simulator

The screen that gets used before every price change.

**Two modes:**

1. **Ingredient shock** — "what if flour goes up 15%?" Enter a percentage change for one or several ingredients and see every affected product's new cost, new margin, and the price each would need to hold its current margin.
2. **Price change** — "what if I charge $2.00 for a concha?" Enter new prices and see the new margins, plus the revenue impact at the last 30 days' volume from `order_items`.

Present results as a table with the delta column color-coded, and a plain-Spanish summary line above it:

> *Si la mantequilla sube 15%, el margen de la concha baja de 77.5% a 74.8%. Para mantener el margen actual tendrías que cobrar $1.81.*

No jargon. The person reading this built the business from a home kitchen and does not need the phrase "contribution margin variance."

---

## `src/lib/admin/costing.ts`

Server-side helpers that call the database functions rather than reimplementing the math in TypeScript:

```ts
export async function getRecipeCost(recipeId: string): Promise<number>       // -> recipe_cost()
export async function getVariantFoodCost(variantId: string): Promise<number | null> // -> variant_food_cost()
export async function getMarginTable(businessId: string): Promise<MarginRow[]>      // -> v_variant_margin
export async function simulateIngredientShock(deltas: Record<string, number>): Promise<SimRow[]>
export async function simulatePriceChange(prices: Record<string, number>): Promise<SimRow[]>
```

**The costing math lives in Postgres, in `recipe_cost()` and `variant_food_cost()`.** Do not reimplement it in TypeScript. Two implementations of the same formula will drift, and the one the owner sees will not be the one the reports use.

The simulator runs inside a transaction that applies the hypothetical costs, reads the results, and **rolls back**. Never write a simulation to the database.

---

## Acceptance criteria

- [ ] Concha recipe against the seeded data returns batch **$18.9277**, per-unit **$0.3943**, margin **77.47%** — matching the verified reference values above.
- [ ] The sugar-shell sub-recipe contributes **$3.152** to the concha batch (960 g of a batch costing $3.94 that yields 1200 g). Verify the division by yield is happening.
- [ ] Doubling butter's `last_unit_cost` from `$0.0095` to `$0.0190` moves the concha unit cost to **$0.5765**. Run it.
- [ ] A recipe line whose unit has no conversion path to the ingredient's stock unit cannot be saved, and the error is legible.
- [ ] A recipe referencing itself as a sub-recipe is rejected by the check constraint, and the UI shows a clear message.
- [ ] Deep nesting past 10 levels raises SQLSTATE `22023` and the UI surfaces it as "receta demasiado anidada," not a 500.
- [ ] A variant with no recipe shows `no_recipe`, not a zero cost or a 100% margin. **A missing recipe must never look like a profitable product.**
- [ ] `sold_at_loss` fires: set a variant's price below its cost and confirm the flag, the color, and the pin-to-top.
- [ ] Weighted average margin uses actual 30-day volume from `order_items`, not a simple mean.
- [ ] The simulator writes nothing — run a simulation, then confirm `last_unit_cost` and `price` are unchanged in the database.
- [ ] CSV export opens correctly in Excel with UTF-8 accents intact (BOM included).
- [ ] **RLS:** a `baker` cannot read `recipes` or `v_variant_margin`. Prove it.
- [ ] Both Spanish and English admin UI. The plain-language summaries read naturally in Spanish, not as machine translation.
- [ ] Recipe line reordering works by keyboard.

## What NOT to do

- Do not reimplement `recipe_cost()` in TypeScript.
- Do not show a food cost of $0 or a margin of 100% for a product with no recipe. Show `no_recipe`.
- Do not persist anything from the simulator.
- Do not round intermediate values. Round once, at display. The functions return `numeric` at 4 decimal places for exactly this reason.
- Do not use `float` anywhere in costing.
- Do not let drag-and-drop be the only way to reorder.
- Do not write the plain-language summaries in English and translate them. Write them in Spanish first.
