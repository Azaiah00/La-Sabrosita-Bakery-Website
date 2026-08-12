# PROMPT 16 — QA, hardening, and the definition of done

> Requires PROMPT 01–15. Nothing ships until every box below is checked with evidence.

---

## Goal

Prove the system works. Not "looks like it works" — prove it, with a test that fails when the thing is broken.

## Files to create

```
tests/unit/
  availability.test.ts
  costing.test.ts
  hours.test.ts
  money.test.ts
  datetime.test.ts
tests/integration/
  place-order.test.ts
  rls.test.ts
  stripe-webhook.test.ts
  standing-orders.test.ts
tests/e2e/
  order-pickup.spec.ts
  order-cake.spec.ts
  wholesale.spec.ts
  portal-realtime.spec.ts
  a11y.spec.ts
tests/load/
  concurrent-orders.ts
vitest.config.ts
playwright.config.ts
.github/workflows/ci.yml
docs/QA-EVIDENCE.md
```

**Playwright note:** Chromium is already at `/opt/pw-browsers`. Do **not** run `playwright install`.

---

## 1. Unit tests

### `availability.test.ts`

- `computeRequiredLeadHours` — base size only; 2-tier; fondant; edible photo; **2-tier + fondant + photo = 264 hours**; a size whose own minimum exceeds every rule.
- Slot generation across the **DST fall-back Sunday** (first Sunday in November) and the **spring-forward Sunday** (second Sunday in March). A 10:00 AM slot is 10:00 AM local on both sides; the stored UTC instant shifts from `14:00Z` to `15:00Z`.
- Blackout dates excluded.
- Closed days produce zero slots.
- Partial-day clipping: earliest legal instant at 15:20 removes that day's 09:00–15:00 slots and keeps 16:00 onward.
- `max_advance_days` takes the **minimum** across matching rules.

### `costing.test.ts`

Against the seeded data, assert exactly:

| Assertion | Expected |
|---|---|
| `recipe_cost(sugar-shell)` | `3.9400` |
| `recipe_cost(concha batch)` | `18.9277` |
| `variant_food_cost(concha)` | `0.3943` |
| concha margin | `77.47%` |
| butter `0.0095 → 0.0190` ⇒ concha cost | `0.5765` |

These were verified by executing the SQL **and** by an independent hand calculation. If a change makes them fail, the change is wrong.

Also: a variant with no recipe returns `null`, not `0`. Mass→volume conversion raises SQLSTATE `22023`.

### `hours.test.ts`
`isOpenNow` across a weekday close, the Sunday close, a `special_hours` closed day, and both DST Sundays. `nextOpenAt` after close on a Saturday points at Sunday 07:00.

### `money.test.ts`
`toCents` / `fromCents` round-trip on awkward values (`0.1 + 0.2`, `19.995`, `1.005`). Formatting in `es-US` and `en-US`.

### `datetime.test.ts`
`localToUtc` and `businessDate` across both DST boundaries and across midnight.

---

## 2. Integration tests (against a real Postgres)

### `place-order.test.ts`
- Happy path creates the order, the items, the status-history row, and increments `qty_reserved`.
- An 86'd item is rejected.
- Insufficient stock rolls the whole transaction back — assert **zero** orphaned `orders` rows.
- `release_order_stock` restores `qty_reserved` and never drives it negative.
- The client's price is ignored; the database price wins.

### `rls.test.ts` — the most important file in this directory

For every one of these, assert **zero rows**:

| Actor | Must not read |
|---|---|
| Staff of business B | anything belonging to business A |
| `counter` role | `ingredients`, `recipes`, `expenses`, `sales_days`, `labor_costs` |
| `baker` role | `expenses`, `sales_days`, `purchase_orders` |
| Wholesale account A | wholesale account B's orders, invoices, price list |
| Wholesale account | `ingredients`, `recipes`, `sales_days` |
| `anon` | `orders`, `customers`, `order_access_tokens`, `expenses` |
| **every role, including `owner`** | `order_access_tokens` via a direct select |

Plus: `get_order_by_token` returns exactly one order for a valid token, `null` for a tampered token, `null` after expiry, and `null` past 50 uses.

### `stripe-webhook.test.ts`
- An unsigned request returns 400.
- A valid `checkout.session.completed` confirms the order and enqueues exactly one email.
- **Replaying the same `event.id` produces no second order and no second email.**
- `checkout.session.expired` releases the stock.
- `charge.refunded` sets `refunded` and writes an audit row.

### `standing-orders.test.ts`
- Materialization creates one order per approved account.
- Running it twice creates nothing extra.
- An account with a manual order for that date is skipped.
- Pending and suspended accounts are skipped.
- 86'd variants are excluded and noted.
- Pricing comes from the account's current price list.

---

## 3. End-to-end (Playwright)

Run every spec in both locales. Run the ordering specs on a real mobile viewport **and** on a physical device before launch.

- `order-pickup.spec.ts` — browse → add three items → pick a slot → Stripe test card `4242 4242 4242 4242` → thank-you → magic link → order visible.
- `order-cake.spec.ts` — all seven steps, reference-photo upload, deposit, confirmation showing the inscription with accents intact.
- `wholesale.spec.ts` — apply → admin approves → password setup → order from the line sheet in cases → invoice appears.
- `portal-realtime.spec.ts` — two browser contexts; advance a status in one; assert the other updates within 2 seconds with no reload.
- `a11y.spec.ts` — `@axe-core/playwright` on every public route in both locales, **zero violations at the `serious` and `critical` levels.**

---

## 4. Load and concurrency — `tests/load/concurrent-orders.ts`

The tests that decide whether this system is safe to run a business on.

1. **Stock race.** 5 units available, 8 concurrent buyers × 2 units. **Exactly 2 succeed.** Assert the final `daily_stock` row reads `available 5 / reserved 4`.
2. **Slot race.** `max_per_slot = 4`, 10 concurrent submissions. **Exactly 4 succeed**, 6 get alternatives.
3. **Deadlock probe.** 20 concurrent multi-item orders with overlapping variants in randomized submission order. **Zero deadlocks** — the ascending `variant_id` lock ordering inside `place_order` is what prevents this, so this test is what proves it still does.
4. **Sustained.** 50 orders/minute for 5 minutes. p95 response under 2 seconds, zero errors, zero overselling.

Record the actual output of every run in `docs/QA-EVIDENCE.md`. A checkbox with no evidence behind it is not a pass.

---

## 5. Performance

| Route | Budget |
|---|---|
| `/es`, `/en` | Lighthouse mobile ≥ 95 all four categories |
| `/es/menu` and every category | ≥ 95 |
| `/es/pasteles` and all three sub-pages | ≥ 95 |
| `/es/pedir`, `/es/pasteles/pedir` | ≥ 95 |
| `/es/mayoreo`, `/es/visitanos`, `/es/nuestra-historia` | ≥ 95 |
| LCP | < 2.0s |
| CLS | < 0.05 |
| INP | < 200ms |
| Initial JS (marketing routes) | < 120 KB gzipped |

Run against the **deployed** URL in PageSpeed Insights, not only locally. Local numbers flatter you.

---

## 6. Security hardening

- [ ] Every server action validates with Zod. No unvalidated input reaches the database.
- [ ] Every server action that mutates checks the caller's role server-side.
- [ ] Rate limiting on: availability API (30/min/IP), all public forms (5/hour/IP), gift-card balance check (3/min/IP), wholesale application (3/hour/IP), magic-link lookup (20/min/IP).
- [ ] Honeypot on every public form.
- [ ] File uploads: MIME sniffed server-side, extension checked, size capped, EXIF stripped, stored in a private bucket, served only by signed URL.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` appears in **zero** client bundles. `grep -r "service_role" .next/static/` returns nothing.
- [ ] No secret is prefixed `NEXT_PUBLIC_` unless it is genuinely public.
- [ ] Security headers present: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] A CSP that does not require `unsafe-eval`.
- [ ] Stripe webhook verifies the signature on the raw body.
- [ ] Twilio inbound webhook verifies its signature.
- [ ] Magic-link tokens: hashed at rest, expiring, use-capped, single-purpose.
- [ ] `npm audit --production` returns zero high or critical findings.
- [ ] Supabase Storage bucket policies reviewed — nothing public that should not be.

---

## 7. Content and correctness — the last gate

- [ ] **Every price is flagged as pending client confirmation.** The old site published prices roughly 50% below current; this cannot repeat.
- [ ] Every fact in §7 of `00-INTEL-AUDIT-PLAN.md` is either confirmed and correct, or still routed through `CONFIRM_WITH_CLIENT`.
- [ ] `ALLOW_UNCONFIRMED` is **not** set in production, and the production build fails if an unconfirmed fact remains.
- [ ] Hours are identical across: the website, the JSON-LD, the Google Business Profile, Facebook, DoorDash and Grubhub. **Four sources currently disagree.**
- [ ] One primary phone number chosen and used consistently everywhere.
- [ ] All Spanish copy proofread by a native speaker. Not a tool — a person.
- [ ] All English copy proofread.
- [ ] No fabricated review, award, press mention, founding year, or allergen claim anywhere.
- [ ] Every review quote carries its real source and date.
- [ ] The cross-contamination disclaimer is on every menu page in both locales.
- [ ] Every product photograph is of the real product.
- [ ] 404, 500, empty, loading and offline states all designed and reachable in both locales.

---

## 8. `.github/workflows/ci.yml`

On every push: typecheck → lint → unit tests → integration tests against a Postgres service container → build → Playwright e2e → Lighthouse CI on the preview deployment. Fail the build on any Lighthouse category below 95, on any `serious`/`critical` axe violation, and on any failing test.

---

## Definition of done

Nothing is done until **all** of the following are true, with evidence recorded in `docs/QA-EVIDENCE.md`:

1. Lighthouse ≥ 95 mobile on every public page, measured on the deployed URL.
2. Zero console errors on every page.
3. Every internal link resolves; zero 404s in a full crawl.
4. The pickup order flow completes end-to-end on a **real phone**.
5. The cake configurator completes end-to-end on a real phone in **under 90 seconds**.
6. The stock-race test passes: **8 concurrent buyers, 5 units, exactly 2 succeed.**
7. The slot-race test passes: **10 concurrent, cap 4, exactly 4 succeed.**
8. The deadlock probe passes: **20 concurrent multi-item orders, zero deadlocks.**
9. A booking across the **DST boundary** is correct in both directions.
10. Email and SMS actually arrive — verified on a real inbox and a real handset.
11. A Stripe test payment succeeds, and a refund flips the order correctly.
12. Replaying a webhook event changes nothing.
13. The staff portal updates in realtime across **two physical devices**.
14. The portal survives an offline period and syncs cleanly on reconnect.
15. **Every RLS test passes**, including every cross-tenant and cross-role case.
16. Keyboard-only pass through: menu → order → checkout; and through the cake configurator.
17. Screen-reader pass on the menu and on the order status page.
18. Reduced-motion pass on every animated surface.
19. All error, empty and loading states designed and reachable.
20. All copy proofread in both languages by a human.
21. Every price flagged as pending confirmation.
22. Hours consistent across all six external surfaces.
23. `npm audit --production` clean at high and critical.
24. No secret in any client bundle.
25. The four legacy iWeb URLs 301 correctly.

## What NOT to do

- Do not check a box without running the test.
- Do not skip the concurrency tests. They are the difference between a demo and a system a family runs a business on.
- Do not test only on a simulator. Use a real phone.
- Do not accept a Lighthouse score from a local run.
- Do not disable a failing test to get the build green.
- Do not ship with `ALLOW_UNCONFIRMED=true`.
- Do not launch until the hours question is settled. It is the single most common cause of a bad review for this business, and it is free to fix.
