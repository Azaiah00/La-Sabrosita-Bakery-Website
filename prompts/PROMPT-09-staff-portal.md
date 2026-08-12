# PROMPT 09 — Staff portal: production board, order queue, waste log

> Requires PROMPT 01–08. Portal styling follows `DESIGN.md` §6 (Seline Analytics treatment).

---

## Goal

Give the counter, the bakers and the decorators one screen each that works at 5 AM under fluorescent light, on a cheap tablet, with a shop WiFi connection that drops. Realtime across devices. Offline-tolerant.

## Files to create

```
src/app/portal/layout.tsx
src/app/portal/page.tsx                    # today at a glance
src/app/portal/produccion/page.tsx
src/app/portal/pedidos/page.tsx
src/app/portal/pedidos/[id]/page.tsx
src/app/portal/merma/page.tsx
src/app/portal/menu-86/page.tsx
src/components/portal/shell.tsx
src/components/portal/order-card.tsx
src/components/portal/status-chip.tsx
src/components/portal/production-row.tsx
src/components/portal/cake-ticket.tsx
src/components/portal/offline-banner.tsx
src/lib/portal/realtime.ts
src/lib/portal/offline-queue.ts
src/app/actions/portal.ts
middleware.ts                              # extend with /portal auth guard
```

---

## Auth and roles

Supabase Auth, email + password. `middleware.ts` guards `/portal/*` and `/admin/*`, redirecting unauthenticated users to `/portal/entrar`.

| Role | Sees |
|---|---|
| `counter` | Order queue, today at a glance, 86 toggle |
| `baker` | Production board, 86 toggle, waste log, order queue read-only |
| `decorator` | Cake tickets, order queue read-only |
| `manager` | Everything in `/portal` + everything in `/admin` |
| `owner` | Everything, plus settings, staff roster, and audit log |

Role comes from `staff_members.role` via the `current_staff_role()` function. The UI hides what a role cannot do; **RLS enforces it regardless** — hiding a button is not a permission model.

## Shell

Persistent left rail on tablet and desktop, bottom tabs on phone. Big targets — 56px minimum, because this is used with flour on your hands. High contrast. A live clock in Richmond local time in the header, because everything on these screens is time-sensitive.

Portal-wide font size runs one step larger than the marketing site.

---

## `/portal` — Today at a glance

Six stat tiles, then two lists.

Tiles: pedidos de hoy · listos para recoger · pasteles hoy · pasteles esta semana · artículos en 86 · merma de ayer ($).

Lists: **next six pickups** (time, name, item count, status) and **shift notes** (what is 86'd, what is short, who is picking up a wedding cake at 2 PM). Shift notes are a simple `settings`-backed note per date, editable by manager and above.

---

## `/portal/produccion` — Production board

The screen the bakers actually use.

For the selected date (default tomorrow), for each tracked variant:

| Producto | De pedidos | Par | A hornear | Hecho | |
|---|---|---|---|---|---|
| Concha | 84 | 180 | **264** | `[  ]` | ✓ |
| Quesadilla entera | 6 | 18 | **24** | `[  ]` | ✓ |

- **De pedidos** — the sum of confirmed order quantities for that date, computed live.
- **Par** — the standing case level from `daily_stock.qty_available`.
- **A hornear** — `de pedidos + par`. Editable; the override is stored on `production_items.qty_planned`.
- **Hecho** — what actually came out. Entering it writes `production_items.qty_produced`, timestamps `produced_at`, and draws the ingredients down through `inventory_transactions` using the recipe BOM (PROMPT 11).

Grouped by station. Printable — a real print stylesheet, because a printed sheet taped to the oven is how this actually gets used.

**Ingredient shortfall warning:** before the shift, compare the planned batches' ingredient draw against `v_ingredient_on_hand`. Anything short shows a `--warn` banner naming the ingredient and the gap: *"Faltan 4.2 lb de mantequilla para el plan de mañana."*

---

## `/portal/pedidos` — Order queue

Three views: **Hoy** · **Próximos** · **Buscar**.

Cards sorted by pickup time. Each shows: time, name, phone (tap to call), type badge (recogida / pastel / catering / mayoreo), item count, total, paid status, and an allergy flag in `--danger` if `allergy_note` is present.

**Allergy notes are never truncated and never hidden behind a tap.** If a note exists, it renders in full on the card.

Status advances via a segmented control: `confirmed → in_production → decorating → ready → completed`, plus `no_show` and `cancelled` behind a confirm dialog. Every change writes `order_status_history` through the trigger and fires the customer notification for `ready` (PROMPT 14).

Staff can also create a phone order: same `place_order` RPC with `source = 'phone'`, so a phone order reserves stock exactly like a web order.

## `/portal/pedidos/[id]` — Order detail and the cake ticket

Full spec. For a cake, `cake-ticket.tsx` renders a printable ticket:

- Order number, pickup date and time, customer name and phone
- Size, tiers, flavor, filling, frosting, finish
- **The inscription, reproduced exactly as the customer typed it**, in a large monospace-adjacent face with accents intact — `Felices 15, Sofía` never becomes `Felices 15, Sofia`
- Color notes and the reference photo (signed URL, printed)
- Allergy note in a bordered box
- Deposit paid / balance due

Print stylesheet targets a 4×6 label and an 8.5×11 sheet. Test both.

---

## `/portal/merma` — Waste log

End of day, two taps per item: pick the product, enter the quantity, pick a reason (`end_of_day`, `damaged`, `expired`, `mistake`, `sample`, `staff_meal`, `other`). Value is computed from the variant price and stored on the row.

A running weekly total sits at the top with last week's comparison. This is usually the fastest money a bakery ever finds, so make it one screen and make it fast — if logging waste takes more than 20 seconds, nobody does it.

---

## `/portal/menu-86` — 86 board

Every active product as a big toggle, grouped by category, searchable. Flipping a toggle sets `is_86ed`, stamps `eighty_sixed_at`, triggers on-demand revalidation of the public menu, and writes an `audit_log` row.

An "un-86 everything" button appears with a confirm dialog — used every morning.

---

## Realtime — `src/lib/portal/realtime.ts`

Supabase Realtime on `orders`, `order_items`, `production_items`, `daily_stock` and `products`, filtered by `business_id`.

- Optimistic UI on every mutation, reconciled against the server response.
- Conflict resolution: last-write-wins on status, **except** that a status may never move backwards past `completed` without a manager override.
- A small connection indicator in the header: green connected, amber reconnecting, grey offline.

## Offline tolerance — `src/lib/portal/offline-queue.ts`

Shop WiFi drops. The board must keep working.

- Read state is cached in IndexedDB and rendered immediately on load.
- Mutations while offline are queued with a client-generated idempotency key and replayed in order on reconnect.
- `offline-banner.tsx` states plainly: *"Sin conexión — 3 cambios pendientes."*
- On reconnect, replay, then reconcile. A mutation that fails server validation surfaces as a dismissible, explicit error naming the order — never silently dropped.
- Payments, refunds and Stripe actions are **never** queued offline. They are disabled with an explanation.

---

## Acceptance criteria

- [ ] **Realtime across two devices:** advance an order on a tablet; a phone reflects it in under 2 seconds with no refresh. Record it.
- [ ] **Cross-role RLS:** sign in as `counter` and attempt to read `expenses`, `sales_days` and `ingredients` via the Supabase client. All return 0 rows. Hiding the nav item is not sufficient — prove it at the data layer.
- [ ] **Cross-tenant RLS:** a staff member of another business sees 0 orders, 0 products, 0 anything.
- [ ] **Offline:** disable the network, advance three orders, re-enable. All three sync, in order, exactly once.
- [ ] Production board math is correct: place 5 orders of 12 conchas for tomorrow, confirm **De pedidos = 60**.
- [ ] Recording production draws ingredients down — verify `v_ingredient_on_hand` moves by the recipe amount.
- [ ] Ingredient shortfall banner fires when planned batches exceed on-hand.
- [ ] 86'ing an item removes it from the public menu within the revalidation window.
- [ ] The cake ticket prints legibly at 4×6 and 8.5×11 with accents intact. Print it on paper and look at it.
- [ ] Allergy notes are visible on the card without interaction.
- [ ] Every touch target ≥ 56px in the portal.
- [ ] Full keyboard pass; visible focus throughout.
- [ ] Portal UI renders in both Spanish and English — `staff_members.locale` drives it, defaulting to Spanish.

## What NOT to do

- Do not rely on the UI to enforce a role. RLS is the permission model.
- Do not truncate, collapse, or hide an allergy note.
- Do not let a status move backwards past `completed` without a manager override and an audit entry.
- Do not queue a payment or refund action offline.
- Do not use a modal for a routine status change. It is a segmented control.
- Do not build this English-only. The people using it at 5 AM read Spanish.
- Do not silently drop a failed offline mutation.
