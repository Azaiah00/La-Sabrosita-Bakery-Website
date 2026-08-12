# PROMPT 08 — Everyday pickup ordering, cart, and Stripe

> Requires PROMPT 01–07.

---

## Goal

Let a customer order a dozen conchas, a full quesadilla, or two dozen assorted for the office — pay on the site, pick it up at a real time slot. This is the feature that stops the marketplace commission bleed.

**The money math:** DoorDash and Grubhub marketplace rates run roughly 15% on pickup and 25–30% on delivery. Stripe is 2.9% + $0.30. On $6,000/month of orders that is roughly $1,500 versus roughly $204. Keep DoorDash for genuine delivery reach; stop paying commission on the customers who were already going to drive over.

## Files to create

```
src/app/[locale]/pedir/page.tsx
src/app/[locale]/pedir/carrito/page.tsx
src/app/[locale]/pedido/[token]/page.tsx
src/app/[locale]/pedido/gracias/page.tsx
src/components/marketing/order/product-picker.tsx
src/components/marketing/order/cart-drawer.tsx
src/components/marketing/order/pickup-slot-picker.tsx
src/components/marketing/order/order-status-card.tsx
src/lib/cart.ts
src/lib/stripe.ts
src/app/api/stripe/webhook/route.ts
src/app/actions/orders.ts
```

---

## The ordering page

Same menu data as PROMPT 04, in an ordering skin. Category tabs, search, and a quantity stepper on every row instead of a static price.

- Tracked items (`product_variants.track_stock = true`) show remaining quantity for the selected date once it drops below 12: *"Quedan 8 para mañana"* / *"8 left for tomorrow."* Honest scarcity, computed from `daily_stock` — never a fake countdown.
- 86'd items are visible but not orderable.
- Products with an `available_from` window show it: *"Sale a las 7:00 a.m."*
- Dozen variants are surfaced next to singles — the *docena* is the natural bakery unit and drives ticket size.

## Cart — `src/lib/cart.ts`

Client state in `localStorage`, keyed by variant id, with a 24-hour expiry. Server **always** re-prices and re-validates.

```ts
type CartLine = { variantId: string; qty: number; note?: string }
type Cart = { lines: CartLine[]; pickupAt?: string; createdAt: string }
```

The cart drawer is a shadcn `Sheet` showing line items, quantities, a running subtotal with tax, the pickup slot, and a single primary CTA. It is reachable from the sticky mobile bar with a live item-count badge.

## Pickup slot picker

Calls the same `/api/availability` engine from PROMPT 07 with `orderType: 'pickup'`. Lead time for everyday pickup is seeded at 12 hours with a 30-day advance window — so an order placed at 8 PM is available from 8 AM the next day, which matches how a bakery actually works.

Slots render as pills grouped by date. The timezone is stated once: *"Hora de Richmond."*

## Checkout — `src/app/actions/orders.ts`

One server action, one transaction, in this order:

1. Zod-validate the cart payload.
2. **Re-price everything from the database.** Discard any price the client sent.
3. `select claim_pickup_slot(...)` for the chosen slot.
4. `select place_order(...)` — the race-safe function from PROMPT 02. It locks each variant row in ascending `variant_id` order, checks `daily_stock`, increments `qty_reserved`, writes the line items, and computes the total. If any item is short, the whole transaction rolls back and nothing is reserved.
5. On a stock conflict, return the shortfall and offer the customer: reduce the quantity, choose another date, or remove the item. Never a generic failure.
6. Generate a magic-link token (32 random bytes; store only the SHA-256 hash) with a 90-day expiry.
7. Create a Stripe Checkout Session.
8. Return the URL.

**The order is `pending_payment` until the webhook fires.** Nothing is confirmed, no email goes out, and no ticket prints before the money clears.

## Stripe

`src/lib/stripe.ts` — server-only client, pinned API version.

**Checkout Session:** `mode: 'payment'`, line items built server-side from the re-priced order, `metadata: { order_id, business_id, order_type }`, `client_reference_id: order.id`, `locale` set from the active route locale so the Stripe page renders in Spanish for `/es` customers.

**Webhook — `src/app/api/stripe/webhook/route.ts`:**

- `export const runtime = 'nodejs'` and read the raw body. Signature verification fails on a parsed body.
- Verify with `STRIPE_WEBHOOK_SECRET`. Reject anything unsigned with a 400.
- **Idempotency:** store `event.id` in a `processed_stripe_events` table with a unique constraint and exit early on conflict. Stripe retries; double-processing an order is a real bug.
- Handle:
  - `checkout.session.completed` → set `status = 'confirmed'`, `amount_paid`, `confirmed_at`, `stripe_payment_intent_id`; upsert the `customers` row; enqueue confirmation email + SMS.
  - `checkout.session.expired` → set `status = 'cancelled'` and call `release_order_stock(order_id)` so the reservation goes back.
  - `charge.refunded` → set `status = 'refunded'`, adjust `amount_paid`, log to `audit_log`.
  - `payment_intent.payment_failed` → leave `pending_payment`, log it.
- Always return 200 quickly. Slow work goes to a background task, not into the webhook response.

Add the migration:

```sql
create table processed_stripe_events (
  event_id   text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table processed_stripe_events enable row level security;
alter table processed_stripe_events force row level security;
-- No client policies: only the service role touches this table.
```

## Abandoned-cart reclaim

A cron route (PROMPT 14) releases stock for any `pending_payment` order older than 30 minutes: set `status = 'cancelled'`, `cancelled_reason = 'payment_timeout'`, then `release_order_stock`. Without this, an abandoned checkout holds the last six tres leches forever.

## Order status page — `/pedido/[token]`

No account, no login. Calls the `get_order_by_token` RPC from PROMPT 02.

Shows: order number, status timeline, items, pickup time in Richmond local, total, amount paid, and the address with a directions link. Actions: add a note, cancel inside the policy window, and download an `.ics` calendar file for the pickup.

Security: the raw token exists only in the emailed URL. The database stores only its SHA-256 hash. The RPC is `security definer`, checks expiry, caps `use_count` at 50, and returns exactly one order or null. `order_access_tokens` is unreadable by every client role — verify that.

## Acceptance criteria

- [ ] End-to-end on a **real phone**: browse → add three items → pick a slot → pay with Stripe test card `4242 4242 4242 4242` → land on the thank-you page → receive the email → open the magic link → see the order. Do this on an actual device, not a simulator.
- [ ] **Concurrency:** 8 simultaneous checkouts for 2 units each against 5 units of stock. Exactly 2 succeed. Paste the resulting `daily_stock` row.
- [ ] Tampering with the price in the DevTools network payload is rejected — the server's price wins.
- [ ] Replaying the same Stripe webhook event twice produces exactly one confirmed order and one email. Use `stripe trigger` or resend from the dashboard.
- [ ] An expired checkout session releases the reservation — verify `qty_reserved` returns to its prior value.
- [ ] An abandoned `pending_payment` order older than 30 minutes is cancelled and its stock released by the cron.
- [ ] Stripe Checkout renders in Spanish when the customer came from `/es`.
- [ ] A refund in the Stripe dashboard flips the order to `refunded` and writes an `audit_log` row.
- [ ] `curl` to the webhook without a valid signature returns 400.
- [ ] The magic-link page loads with a valid token, returns null for a tampered one, and null after expiry.
- [ ] `select token_hash from order_access_tokens limit 5` shows only 64-character hex hashes.
- [ ] Full keyboard pass through browse → cart → slot → checkout.
- [ ] Lighthouse mobile ≥ 95 on `/es/pedir`.
- [ ] Both locales; `/es` first.

## What NOT to do

- Do not trust a client-supplied price, quantity total, or tax figure.
- Do not check stock in TypeScript and then insert. `place_order` does both, in one transaction.
- Do not parse the Stripe webhook body before verifying the signature.
- Do not process a webhook without an idempotency guard.
- Do not confirm an order, send an email, or print a ticket before payment clears.
- Do not store a raw magic-link token.
- Do not show a fake countdown or a fake "3 people are viewing this." Scarcity is computed from `daily_stock` or it is not shown.
- Do not require an account. Guest checkout is the whole point.
