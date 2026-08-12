# PROMPT 13 — The wholesale portal

> Requires PROMPT 01–12. This is the highest-leverage single feature in the project.

---

## Goal

Digitize the ~250-store wholesale book. Line sheet, account approval, standing orders, route planning, invoicing, and receivables aging.

**Why this matters more than anything else in the build:** the client's own About page states they distribute to about 250 Hispanic stores across Virginia, the Eastern Shore, and Elizabeth City, North Carolina. There is no wholesale page, no line sheet, no reorder form, no order history and no account portal anywhere. Every reorder is a phone call. No competitor in this market has anything remotely like this.

*(The 250 figure comes from the client's own published copy and is stale. Re-confirm the current number before the pitch — it is item 13 in the confirmation list.)*

## Files to create

```
src/app/[locale]/mayoreo/page.tsx              # public: the pitch + application
src/app/[locale]/mayoreo/solicitud/page.tsx    # application form
src/app/mayoreo/                               # authenticated wholesale customer portal
  layout.tsx
  page.tsx                                     # dashboard
  pedir/page.tsx                               # order from the line sheet
  pedidos/page.tsx
  facturas/page.tsx
  cuenta/page.tsx
src/app/admin/mayoreo/page.tsx                 # admin: accounts
src/app/admin/mayoreo/[id]/page.tsx
src/app/admin/mayoreo/rutas/page.tsx
src/app/admin/mayoreo/facturas/page.tsx
src/app/admin/mayoreo/listas-precios/page.tsx
src/components/wholesale/line-sheet.tsx
src/components/wholesale/quick-reorder.tsx
src/components/wholesale/invoice-table.tsx
src/components/admin/route-sheet.tsx
src/components/admin/aging-table.tsx
src/app/actions/wholesale.ts
```

---

## Part A — Public: `/mayoreo`

Spanish-first, because the buyer is a Hispanic grocery store owner.

- H1 **ES:** *Surte tu tienda con pan dulce fresco* · **EN:** *Stock your store with fresh pan dulce*
- The pitch: what they supply, how often, minimums, delivery territory (Virginia, the Eastern Shore, Elizabeth City NC), and what a route delivery looks like.
- A **public line sheet preview** — categories and case sizes, **without prices**. Prices appear after approval, which is how wholesale works and also stops retail customers from seeing wholesale pricing.
- Trust: years supplying stores, the store count, and a photograph of the delivery van or a loaded route rack.
- CTA: **Abrir una cuenta**.

### `/mayoreo/solicitud` — Application

Store name, DBA, contact name, phone, email, full address, resale certificate upload, preferred delivery day, and estimated weekly volume. Ten fields, no more.

- Writes a `wholesale_accounts` row with `status = 'pending'`.
- Resale certificate to a private bucket; MIME sniffed server-side; PDF and image accepted; max 10 MB.
- Notifies the shop by email; confirms to the applicant in their language.
- Honeypot plus rate limiting — 3 applications per IP per hour.

---

## Part B — Admin: account management

`/admin/mayoreo` — table of accounts with status, delivery day, route, price list, credit terms, last order date, and outstanding balance. Filter by status and by route.

`/admin/mayoreo/[id]` — the account: details, resale certificate viewer with expiry tracking (`--warn` at 30 days out, `--danger` when expired), assigned price list, delivery day and route, credit terms, order history, invoice history, and a notes field.

**Approving an account** in one transaction: set `status = 'approved'`, stamp `approved_at`, assign the default price list, create the Supabase Auth user, insert a `wholesale_invite` token into `order_access_tokens` (hashed, 14-day expiry), and email the welcome + password-setup link. Write an `audit_log` row.

`/admin/mayoreo/listas-precios` — price lists and their items. Per-variant `unit_price`, `case_qty`, `min_qty`. A second price list can be created for volume accounts; assigning it to an account is one dropdown.

---

## Part C — The wholesale customer portal (`/mayoreo/*`, authenticated)

This is what replaces the phone call.

### Dashboard
Next delivery day, the standing order for that day, current balance, and one large **Repetir mi último pedido** button. For most accounts most weeks, that button is the entire interaction — make it the biggest thing on the screen.

### `/mayoreo/pedir` — Order from the line sheet

`line-sheet.tsx`: every variant on the account's price list, grouped by category, with case quantity, unit price, case price, and a quantity stepper in **cases**, not units — because that is how the buyer thinks and how the van is loaded.

- Minimum quantities enforced from `price_list_items.min_qty`.
- Running total by case and by dollar.
- Cutoff notice computed from `lead_time_rules` for `wholesale`: *"Pedidos para el martes se cierran el lunes a las 6:00 p.m."*
- Submitting creates an `orders` row with `order_type = 'wholesale'`, the `wholesale_account_id` set (the schema's check constraint requires it), `source = 'wholesale_portal'`, priced from the account's price list — **never from retail prices**.

### `quick-reorder.tsx`
Shows the last three orders. One tap loads any of them into the cart, with a clear diff if an item is now inactive or 86'd: *"El chicharrón de mango ya no está disponible."*

### `/mayoreo/pedidos` and `/mayoreo/facturas`
Order history with status. Invoice list with number, issue date, due date, total, paid, balance, and a PDF download. Overdue invoices flagged in `--danger` with days past due.

---

## Part D — Standing orders and route sheets

**Standing orders** (`standing_orders` + `standing_order_items`): a per-account weekly template by day of week. A cron (PROMPT 14) materializes them into real `orders` at the cutoff, so the bakery's production board already knows Tuesday's route before anyone calls.

Materialization rules — get these right:
- Only for accounts with `status = 'approved'`.
- Skip an account that has already placed a manual order for that delivery date. **Never double-order.** Guard with a unique partial index on `(wholesale_account_id, pickup_at::date)` for `order_type = 'wholesale'`.
- Skip 86'd or inactive variants and record why on the order note.
- Price from the account's current price list at materialization time, not at template-creation time.
- Notify the account by email the evening before, with a window to edit.

**`/admin/mayoreo/rutas`** — the route sheet. Pick a day; get every approved account on that route with its order, in delivery sequence, with case counts and a signature line. Printable, and the print layout is the deliverable — this sheet rides in the van.

Aggregate totals per route feed straight into the production board, so the bakers know Tuesday needs 96 conchas for La Esperanza before anyone asks.

---

## Part E — Invoicing and aging

`/admin/mayoreo/facturas`:

- Generate an invoice from one or several delivered orders. `invoice_number` from `invoice_number_seq`, formatted `INV-NNNNNN`.
- Due date = issue date + `wholesale_accounts.credit_terms_days`. The schema's check constraint enforces `due_date >= issue_date`.
- Record payments against an invoice; `invoice_payments` rows sum into `amount_paid`; status moves `sent → partial → paid` automatically.
- PDF generation with the bakery's letterhead, both phone numbers, and the payment terms.

**`aging-table.tsx`** from `v_wholesale_aging` — buckets `current`, `1_30`, `31_60`, `61_90`, `over_90`, with totals per bucket and per account. `over_90` in `--danger`. This is the screen that gets money collected.

---

## Acceptance criteria

- [ ] A wholesale account sees **only its own** orders, invoices and price list. Sign in as account A and query account B's data directly through the Supabase client — 0 rows. Prove it at the data layer.
- [ ] A wholesale account **cannot** read `ingredients`, `recipes`, `sales_days`, `expenses`, or any other account's rows.
- [ ] Wholesale orders price from the account's price list. Verify a variant whose retail price differs and confirm the wholesale price is used.
- [ ] The schema constraint holds: an `orders` row with `order_type = 'wholesale'` and a null `wholesale_account_id` is rejected.
- [ ] **Standing-order materialization never double-orders.** Run the cron twice for the same day and confirm exactly one order per account. Then place a manual order for that account and date, run the cron, and confirm it is skipped.
- [ ] An 86'd variant is excluded from materialization and the reason appears on the order note.
- [ ] Minimum case quantities are enforced server-side, not only in the UI.
- [ ] The route sheet prints in delivery sequence with correct case totals and a signature line. Print it.
- [ ] Route totals aggregate into the production board.
- [ ] Aging buckets are correct. Seed one invoice per bucket and verify all five classify correctly, including `paid` at a zero balance.
- [ ] Invoice PDF renders with accents intact and correct terms.
- [ ] Recording a partial payment moves status to `partial`; paying the balance moves it to `paid`.
- [ ] Resale-certificate expiry warns at 30 days and flags when expired.
- [ ] Account approval creates the auth user, the hashed invite token, and the email — and writes an audit row.
- [ ] Public line sheet shows **no prices** to an unauthenticated visitor. Verify with `curl`.
- [ ] The customer portal is fully usable in Spanish, on a phone, by someone who has never used a web app.

## What NOT to do

- Do not show wholesale prices publicly.
- Do not price a wholesale order from retail prices.
- Do not let standing-order materialization run without the double-order guard.
- Do not materialize for a pending or suspended account.
- Do not build the ordering UI in units. Wholesale is ordered in cases.
- Do not require the buyer to create a password before you have approved them.
- Do not make the route sheet a screen-only view. It is a printed document.
- Do not skip the RLS proof. This is the single most sensitive data boundary in the system — one grocery store seeing another's pricing would end the relationship.
