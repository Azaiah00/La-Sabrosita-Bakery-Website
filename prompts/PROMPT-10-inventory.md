# PROMPT 10 — Admin: inventory, unit conversions, vendors, purchase orders

> Requires PROMPT 01–09. Portal styling follows `DESIGN.md` §6.

---

## Goal

Build the inventory half of the Bakery OS: ingredients with real purchase-vs-recipe unit handling, an append-only stock ledger, physical counts, vendors with price history, and purchase orders that update stock on receipt.

**The central idea:** on-hand is never a mutable column. It is always `sum(inventory_transactions.qty_delta)`. Every movement of every ingredient leaves a row. That is what makes the finance side trustworthy later.

## Files to create

```
src/app/admin/inventario/page.tsx
src/app/admin/inventario/[id]/page.tsx
src/app/admin/inventario/conteo/page.tsx
src/app/admin/unidades/page.tsx
src/app/admin/proveedores/page.tsx
src/app/admin/proveedores/[id]/page.tsx
src/app/admin/compras/page.tsx
src/app/admin/compras/nueva/page.tsx
src/app/admin/compras/[id]/page.tsx
src/components/admin/ingredient-table.tsx
src/components/admin/ingredient-form.tsx
src/components/admin/unit-converter-field.tsx
src/components/admin/stock-ledger.tsx
src/components/admin/count-sheet.tsx
src/components/admin/po-builder.tsx
src/components/admin/po-receive.tsx
src/lib/admin/units.ts
src/app/actions/inventory.ts
```

---

## `/admin/inventario` — Ingredient list

Table from `v_ingredient_on_hand`, sorted with everything needing reorder pinned to the top.

| Ingrediente | En existencia | Punto de pedido | Par | Costo unitario | Valor | |
|---|---|---|---|---|---|---|
| Mantequilla | **8,000 g** ⚠ | 9,000 g | 27,000 g | $0.0095/g | $76.00 | Pedir |

- Stock shown in the ingredient's stock unit, with a friendlier secondary rendering (`8,000 g · 17.6 lb`) because nobody thinks in grams at the receiving door.
- `needs_reorder` rows get a `--warn` left border and a `⚠`. Zero or negative on-hand gets `--danger`.
- Total inventory value in the header — a real balance-sheet number the owner has probably never seen.
- Filters: needs reorder · perishable · by vendor · inactive.
- All numbers `tabular-nums`.

## `/admin/inventario/[id]` — Ingredient detail

Three panels:

1. **Details** — bilingual names, stock unit, purchase unit, pack quantity, current unit cost, reorder point, par, perishable flag, shelf life.
2. **Ledger** — the full `inventory_transactions` history, newest first, with a running balance column, filterable by type and date, exportable to CSV.
3. **Cost history** — unit cost over time from receipts, as a small line chart, plus **which products this ingredient appears in and what a 10% price move does to each of their food costs.** That last panel is the one that makes an owner sit up.

## The unit-conversion UX — `unit-converter-field.tsx`

This is where most inventory systems fail. Get it right.

When creating an ingredient, the admin states:

- **How we hold it** (stock unit) — e.g. grams
- **How we buy it** (purchase unit) — e.g. a 50 lb sack
- **How many stock units are in one purchase unit** — auto-filled from `unit_conversions` when a path exists (50 lb sack → 22,679.6185 g), editable when it does not

The field shows a live plain-language confirmation:
> *1 saco de 50 lb = 22,679.6185 g. A $24.95 el saco, el costo es $0.0011 por gramo.*

If no conversion path exists between the two units, the field **blocks saving** and offers to create the conversion row. It never guesses. `convert_qty()` raises SQLSTATE `22023` in that case by design — surface that as a clear message, not a 500.

## `/admin/unidades` — Units and conversions

A small screen the owner rarely opens but must exist. Lists units by dimension and every conversion factor. Guards:

- A conversion may not be created between different dimensions (mass ↔ volume) — that is a density, not a conversion, and pretending otherwise silently corrupts every food cost downstream.
- Deleting a unit in use is blocked by the FK; surface it as *"Esta unidad se usa en 12 ingredientes"*, not a database error.

## `/admin/inventario/conteo` — Physical count

The Sunday-night screen.

- Pick a location and a date. Renders every active ingredient with its expected on-hand and an empty input for counted.
- Entering a count writes an `inventory_transactions` row of type `count` with `qty_delta = counted − expected` — **the variance, not the absolute**, so the ledger stays append-only and the history stays intact.
- Variance column with $ value and a `--danger` flag beyond ±5%.
- Save is one transaction: all-or-nothing.
- Printable blank count sheet, because this gets done on paper first.

## `/admin/proveedores` — Vendors

CRUD plus, per vendor, the ingredients they supply with pack size, pack price, and lead time. `is_preferred` is enforced unique per ingredient by a partial index — setting a new preferred vendor clears the old one in the same transaction.

Vendor detail shows PO history, average lead time actually observed (received date minus sent date), and price trend per ingredient.

## `/admin/compras` — Purchase orders

**Builder (`/nueva`):**

- Pick a vendor → the screen suggests every ingredient from that vendor currently at or below its reorder point, pre-filled with the quantity needed to reach par. One click builds most of the order.
- Add any other ingredient manually.
- Live totals; a `--warn` if below the vendor's minimum order.
- `po_number` generated as `PO-YYYYMM-NNN`.
- Save as draft, or mark sent — marking sent stamps `sent_at` and offers a formatted email to the vendor.

**Receiving (`/[id]` → Recibir):**

- Line by line, enter quantity received. Defaults to ordered. Partial receipts are normal and fully supported — status becomes `partial` and the PO stays open.
- On save, in **one transaction**:
  1. Update `qty_received` per line.
  2. Insert an `inventory_transactions` row of type `receipt` per line, converting the purchase quantity to stock units via `convert_qty`.
  3. Update `ingredients.last_unit_cost` to the newly received cost per stock unit.
  4. Set PO status to `received` or `partial`.
  5. Insert an `expenses` row against the "Ingredientes" category, linked back to the PO.
  6. Write an `audit_log` row.
- A price change on receipt shows a diff before saving: *"El costo de la mantequilla sube de $0.0095 a $0.0112 por gramo (+17.9%). Esto afecta 8 productos."* — with the affected products listed and their new margins. **Never silently change a cost that drives every food cost in the business.**

## `src/app/actions/inventory.ts`

Every mutation is a server action that:

- validates with Zod;
- checks the caller is `manager` or `owner` via `is_manager()` — client-side role checks are not a permission model;
- runs inside a single transaction;
- writes an `audit_log` row on anything destructive or financial;
- returns a typed result, never a thrown string.

## Acceptance criteria

- [ ] Creating an ingredient with a 50 lb sack purchase unit and grams stock unit auto-fills **22,679.6185** and computes **$0.0011/g** at $24.95 per sack.
- [ ] Attempting a mass↔volume conversion is blocked with a clear message, not a 500.
- [ ] The ledger's running balance matches `ingredient_on_hand()` exactly for every ingredient. Verify with a query that diffs them across all rows and returns zero mismatches.
- [ ] Receiving a PO increases on-hand by the converted amount — verify by hand for one line.
- [ ] Receiving a PO at a different price updates `last_unit_cost` **and** shows the affected-products diff first.
- [ ] Receiving a PO creates exactly one `expenses` row linked to the PO.
- [ ] A partial receipt leaves the PO open at `partial` and receiving the remainder closes it.
- [ ] A physical count writes a variance row, not an absolute — verify the ledger still contains the prior receipt.
- [ ] Reorder suggestions on the PO builder match `v_ingredient_on_hand.needs_reorder` exactly.
- [ ] **RLS:** a `baker` account cannot read or write `ingredients`, `purchase_orders`, or `expenses`. Prove it at the data layer.
- [ ] Every destructive action writes an `audit_log` row with before and after.
- [ ] All numeric columns are `tabular-nums` and right-aligned.
- [ ] Both Spanish and English admin UI.
- [ ] The count sheet and the PO both print cleanly.

## What NOT to do

- Do not store on-hand as a mutable column. Ever.
- Do not hard-code a unit conversion in TypeScript. Conversions are rows.
- Do not allow a conversion across dimensions.
- Do not overwrite an ingredient cost without showing what it does to margins first.
- Do not use `float` for a quantity or a cost. `numeric(14,4)` and `numeric(12,4)`.
- Do not let a physical count rewrite history. It writes a variance transaction.
- Do not trust a client-side role check.
