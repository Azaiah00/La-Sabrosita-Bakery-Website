# PROMPT 07 — Cake configurator and the lead-time availability engine

> Requires PROMPT 01–06. This is the highest-value conversion surface in the build.

---

## Goal

Build a cake configurator that takes a complete, documented, deposited custom-cake order in under 90 seconds on a phone — with a real availability engine that will never promise a pickup slot the bakery cannot make.

## Files to create

```
src/app/[locale]/pasteles/pedir/page.tsx
src/components/marketing/cake-configurator/index.tsx
src/components/marketing/cake-configurator/step-occasion.tsx
src/components/marketing/cake-configurator/step-size.tsx
src/components/marketing/cake-configurator/step-flavor.tsx
src/components/marketing/cake-configurator/step-decoration.tsx
src/components/marketing/cake-configurator/step-pickup.tsx
src/components/marketing/cake-configurator/step-contact.tsx
src/components/marketing/cake-configurator/step-review.tsx
src/components/marketing/cake-configurator/price-summary.tsx
src/lib/availability.ts
src/lib/schema/cake-order.ts
src/app/api/availability/route.ts
supabase/migrations/0002_cake_slots.sql
```

---

## Part A — The availability engine (`src/lib/availability.ts`)

This is the part that must be right. Everything else is UI.

### Inputs

```ts
type SlotQuery = {
  businessId: string
  locationId: string
  orderType: 'cake' | 'pickup' | 'catering'
  sizeId?: string          // cake only
  tiers?: number           // cake only
  optionIds?: string[]     // flavor/filling/frosting/finish — some add lead hours
  fromDate: string         // yyyy-MM-dd, in America/New_York
  days: number             // how far forward to compute
}
```

### The algorithm — in this exact order

1. **Compute required lead hours.**
   Start from `cake_sizes.min_lead_hours` for the chosen size. Then apply every matching row in `lead_time_rules` where `applies_to` matches and (`min_tiers` is null or `tiers >= min_tiers`) and (`min_servings` is null or `servings >= min_servings`) and (`requires_finish_slug` is null or that finish is selected). **Take the maximum, not the first match, not the sum.** Then add `sum(cake_options.extra_lead_hours)` for every selected option.
   *Worked example:* 2-tier + fondant + edible photo = max(size 168, rule-2tier 168, rule-photo 72) = 168, plus fondant 72 + photo 24 = **264 hours**.

2. **Compute the earliest legal instant.** `now` (UTC) + required hours. Convert to `America/New_York` **via `date-fns-tz`**, never via string math.

3. **Apply the max advance window.** `lead_time_rules.max_advance_days`, taking the *minimum* across matching rules.

4. **Drop blackout dates.** Any date in `cake_blackout_dates` where `blocks_all` is true is removed entirely. Blackouts are seeded for Mother's Day / Día de las Madres, graduation weekends and Christmas; the client edits them in the admin portal.

5. **Drop closed days.** Cross-check `opening_hours` and `special_hours`. A pickup can never be offered on a day the bakery is shut.

6. **Generate slots.** For each surviving date, take the matching `pickup_capacity_rules` row for that `dow` and `applies_to`, and emit slots from `window_start` to `window_end` at `slot_minutes` intervals — clipped to the actual opening hours for that date.

7. **Subtract booked capacity.** For each slot, count existing `orders` with the same `order_type` whose `pickup_at` falls in the slot and whose status is not `cancelled`, `no_show` or `refunded`. Drop the slot when the count reaches `max_per_slot`.

8. **Drop slots earlier than the earliest legal instant** — including partial days. If the earliest legal instant is Thursday 15:20, Thursday's 09:00–15:00 slots are gone and 16:00 onward survive.

### Timezone rules — non-negotiable

- Every stored instant is `timestamptz` in UTC.
- Every slot is generated as a **wall-clock time in `America/New_York`** and converted with `fromZonedTime`.
- **Never** `new Date('2026-11-01T10:00')`. **Never** `setHours`. **Never** manual offset arithmetic.
- The engine must be correct across the DST fall-back Sunday (first Sunday in November) and the spring-forward Sunday (second Sunday in March). Both are unit-tested.

### `src/app/api/availability/route.ts`

`GET` with the query params above. Returns `{ dates: [{ date, slots: [{ startsAt, label }] }], earliestLegal, requiredLeadHours, reasons: string[] }`. Cached 60s. Rate-limited to 30 requests/minute/IP.

`reasons` is human-readable and shown to the customer when a date is unavailable — *"Los pasteles de dos pisos necesitan 7 días"* / *"Two-tier cakes need 7 days"*. A greyed-out calendar with no explanation is a conversion killer.

---

## Part B — `supabase/migrations/0002_cake_slots.sql`

Add a partial unique guard so slot capacity cannot be exceeded by a race, and an index for the counting query:

```sql
create index if not exists orders_pickup_slot_idx
  on orders (location_id, order_type, pickup_at)
  where status not in ('cancelled','no_show','refunded');

-- Advisory-lock helper so two concurrent bookings of the same slot serialize.
create or replace function claim_pickup_slot(
  p_location_id uuid,
  p_order_type  order_type,
  p_slot_start  timestamptz,
  p_slot_minutes integer,
  p_max_per_slot integer
) returns boolean
language plpgsql as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_location_id::text || p_order_type::text || p_slot_start::text, 0)
  );

  select count(*) into v_count
    from orders
   where location_id = p_location_id
     and order_type  = p_order_type
     and pickup_at  >= p_slot_start
     and pickup_at   < p_slot_start + make_interval(mins => p_slot_minutes)
     and status not in ('cancelled','no_show','refunded');

  return v_count < p_max_per_slot;
end;
$$;
```

The lock is transaction-scoped, so it releases automatically on commit or rollback. Call `claim_pickup_slot` inside the same transaction as the order insert — checking first and inserting later is exactly the bug this prevents.

---

## Part C — The configurator, seven steps

Framer Motion stepper. Direction-aware 200ms slide + fade. State in a single `useReducer`, persisted to `sessionStorage` so a phone call mid-order does not lose the work. `aria-current="step"` on the active step and a visually-hidden live region announcing *"Paso 3 de 7: Sabor"*.

**A running price summary is visible at every step** — sticky bottom on mobile, sidebar on desktop. It shows base + each delta as a line item, then the total, then the deposit. Never a surprise at the end.

### Step 1 — Ocasión
Four large tap targets: Quinceañera · Cumpleaños · Boda · Otro. Presets the occasion tag and, for Boda, switches the flow to a quote request at step 7 rather than an immediate charge.

### Step 2 — Tamaño
Cards from `cake_sizes`: label, serving range, "desde $X", and the lead time. Selecting one recomputes availability immediately.

### Step 3 — Sabor y relleno
Radio groups from `cake_options` grouped by `flavor` and `filling`. Price deltas shown inline (*"+$5"*). Options with `extra_lead_hours > 0` show a small note.

### Step 4 — Decoración
Frosting (crema batida / buttercream / fondant), finish (sencillo / flores / foto comestible), inscription (120 chars max, live counter, and an inscription-language toggle so accents render correctly on the ticket), color notes, and a reference photo upload.

Upload rules: max 8 MB, `image/jpeg|png|webp|heic` only, MIME sniffed server-side and not trusted from the client, stored in a private Supabase Storage bucket, served to staff via a signed URL. Strip EXIF before storing.

### Step 5 — Recogida
Calendar from the availability API. Unavailable dates are visibly disabled **with the reason**. Available slots render as pills. Timezone shown explicitly the first time: *"Hora de Richmond."*

### Step 6 — Contacto
Name, phone, email, allergy note, and an SMS opt-in checkbox with the full TCPA disclosure text (see PROMPT 14 — the checkbox is unchecked by default and the disclosure is visible, not behind a link). Six fields. Nothing else.

### Step 7 — Revisar y depositar
Full spec restated, the total, the deposit amount, and the cancellation policy **in plain language above the pay button**:

**ES:** *Depósito de 30% ($XX.XX) para confirmar. Cancelación con más de 72 horas: reembolso completo. Entre 48 y 72 horas: 50%. Menos de 48 horas: sin reembolso.*

Then Stripe Checkout (see PROMPT 08). For weddings, the button reads *"Solicitar cotización"* and creates a `draft` order with no charge.

---

## Server action — `submitCakeOrder`

One transaction:

1. Re-validate the entire payload with Zod, server-side. **Never trust a client price.**
2. Recompute the price from `cake_sizes.base_price` + every `cake_options.price_delta` server-side. If it differs from the submitted total, discard the client's number and use the server's.
3. Re-run the availability check for the chosen slot. A slot that was free when the page loaded may not be free now.
4. `select claim_pickup_slot(...)` — if false, return a friendly conflict and the three nearest alternatives.
5. Insert the `orders` row and the `cake_order_details` row.
6. Generate a magic-link token: random 32 bytes, store only `encode(digest(token,'sha256'),'hex')` in `order_access_tokens` with a 90-day expiry.
7. Create the Stripe Checkout session for the deposit.
8. Return the checkout URL.

Order confirmation emails and SMS are sent from the Stripe webhook, not from this action — an order is not confirmed until the deposit clears.

---

## Acceptance criteria

- [ ] Unit tests for `computeRequiredLeadHours` covering: base size only; 2-tier; fondant; edible photo; 2-tier + fondant + photo (expect **264**); and a size whose own minimum exceeds every rule.
- [ ] Unit tests for slot generation across the **DST fall-back Sunday** and the **spring-forward Sunday**. A 10:00 AM slot is 10:00 AM local on both sides.
- [ ] Blackout dates are excluded and the reason is shown.
- [ ] Closed days never produce a slot.
- [ ] **Concurrency:** fire 10 simultaneous submissions for a slot with `max_per_slot = 4`. Exactly 4 succeed; 6 receive the conflict response with alternatives. Run it and paste the result.
- [ ] Server-side price recomputation rejects a tampered client total — verify by editing the payload in DevTools.
- [ ] The whole flow completes keyboard-only, with no focus trap, and each step change is announced.
- [ ] `sessionStorage` restore works: fill three steps, reload, land back on step 3 with the data intact.
- [ ] Upload rejects a 9 MB file and a `.pdf` renamed to `.jpg`.
- [ ] The magic-link token is never written to the database in plaintext — grep the `order_access_tokens` table and confirm only hashes.
- [ ] Completes in under 90 seconds on a phone, measured with a stopwatch on a real device.
- [ ] Lighthouse mobile ≥ 95 on the configurator route.
- [ ] Reduced-motion: the stepper still advances, with no slide animation.
- [ ] Both locales; `/es` checked first.

## What NOT to do

- Do not compute lead time by summing every matching rule. Take the **max** of the rules, then **add** the option extras.
- Do not trust any price, total, or deposit sent from the client.
- Do not check slot capacity in application code and insert afterwards. The check and the insert share one transaction and one advisory lock.
- Do not use `new Date(string)`, `setHours`, or manual UTC offsets anywhere in the availability engine.
- Do not grey out a date without telling the customer why.
- Do not store a raw magic-link token.
- Do not send a confirmation before the deposit clears.
- Do not add a field to the contact step. Six is the maximum.
