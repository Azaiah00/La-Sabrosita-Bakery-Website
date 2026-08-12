# CLAUDE.md — La Sabrosita Bakery

**Claude Code and Cursor load this file automatically. It applies to every task in this repo.**

Project: bilingual website + Bakery OS for **La Sabrosita Bakery**, a Salvadoran-founded Latin bakery (panadería) at 7730 Midlothian Turnpike Ste A, Richmond, VA 23235.

---

## ⚠ Current phase: DEMO MODE

There is a live sales demo with the client. This build runs with **zero external services** — no Supabase cloud, no Stripe, no Twilio, no Resend, no OAuth.

- All data access goes through `db` from `src/lib/data`, which switches on `NEXT_PUBLIC_DEMO_MODE`.
- **Never import `@supabase/supabase-js` directly into a page, component, or action.** Go through `db`.
- Payments, email and SMS are stubbed per `prompts/PROMPT-00-DEMO-MODE.md`. Never let the UI imply a real charge or a real send.
- Demo-only code (role cards, the demo pay route) must be gated behind `IS_DEMO` and must not render in a non-demo build.
- Keep `supabase/migrations/0001_schema.sql` and `supabase/seed.sql` in the repo. They are the fixture source and they go live after the sale.

Read `prompts/PROMPT-00-DEMO-MODE.md` before anything else.

---

## Before you write anything

1. **Read `DESIGN.md`.** It is the styling source of truth. No default Tailwind or shadcn colors, ever.
2. **Read the prompt you were given** in `prompts/`. PROMPT-00 first, then 01 → 16. Each states its dependencies.
3. If you need a client fact, it is in `00-INTEL-AUDIT-PLAN.md` §1. If it is not there, it is unconfirmed — see the rule below.

---

## Standing rules

### Language
- **Spanish is the default locale.** `/` redirects to `/es`. Never write English-first UI.
- Every user-facing string exists in `src/messages/es.json` and `en.json`.
- Product names are Spanish. *Concha* is a concha; "Sweet Bread" is a gloss beneath it, never the primary label.
- Write Spanish copy first, then English. Do not machine-translate either direction.
- **Lay out for the Spanish string.** It runs 15–20% longer. If a button fits "Order a Cake" but breaks on "Pedir un Pastel", the button is wrong. Check `/es` before `/en`.
- The admin and staff portals are bilingual too — the owner works in Spanish.

### Facts
- **Never invent a price, an hour, an allergen claim, an award, a review, or a founding year.**
- Anything unconfirmed goes through `CONFIRM_WITH_CLIENT()` from `src/lib/constants.ts`. It warns in dev and **throws in a production build**. Do not work around it, and never set `ALLOW_UNCONFIRMED=true` outside a preview build.
- Dietary and allergen tags come from the client in writing. Never infer one from an ingredient list.
- Customer reviews are quoted verbatim with source and date. Never translated, paraphrased, or embellished.
- The client's published prices are roughly 50% of current reality. Every price in this build is a placeholder until re-quoted.

### Data and money
- **Money is `numeric(12,2)` in Postgres and integer cents in TypeScript. Never a float.**
- Quantities are `numeric(14,4)`.
- **Inventory on-hand is never a stored column.** It is always `sum(inventory_transactions.qty_delta)`.
- Unit conversions are rows in `unit_conversions`. Never hard-code one in TypeScript.
- Costing math lives in Postgres (`recipe_cost()`, `variant_food_cost()`). **Do not reimplement it in TypeScript** — two implementations drift.
- Financial aggregates come from the views (`v_pnl_monthly`, `v_variant_margin`, etc.). TypeScript formats; Postgres computes.

### Time
- Store UTC (`timestamptz`). Render `America/New_York`.
- Always go through `src/lib/datetime.ts`. **Never** `new Date('2026-11-01T10:00')`, **never** `setHours`, **never** manual offset arithmetic.
- Any change to pickup slots, availability, or hours must stay correct across both DST Sundays. There are tests for this.

### Concurrency and security
- Stock checks and order writes happen **inside one transaction** via the `place_order()` RPC. Never check in application code and insert afterwards.
- `place_order()` locks variants in ascending `variant_id` order. That ordering is what prevents deadlock — do not change it.
- RLS is the permission model. Hiding a button is not a permission. Never loosen a policy to make a query work; if broader access is genuinely needed, write a `security definer` function with an explicit guard.
- Magic-link tokens are stored **SHA-256 hashed only**. `order_access_tokens` is unreadable by every client role. Guest lookup goes through `get_order_by_token()` and nothing else.
- Never trust a client-supplied price, total, quantity, or role.
- Stripe webhooks: verify the signature on the **raw body**, and guard idempotency on `event.id`.

### Accessibility and performance
- WCAG 2.2 AA is the floor. One `<h1>` per page, no skipped heading levels, visible focus everywhere, every image has descriptive bilingual alt text.
- Lighthouse ≥ 95 mobile on every public page. LCP < 2.0s, CLS < 0.05, INP < 200ms.
- Animate `transform` and `opacity` only. Every animation gets a `prefers-reduced-motion` off-ramp. Max two visible effects per viewport.
- No motion-library work on the main thread before LCP paints.
- **No React Three Fiber in this project.** A bakery menu does not earn a 3D engine.

---

## Verified reference values — do not let these drift

The schema and seed were executed against PostgreSQL 16.13 and cross-checked by hand. If your change makes any of these fail, **the change is wrong** — do not adjust the seed to match your output.

| Check | Expected |
|---|---|
| `recipe_cost(sugar-shell sub-recipe)` | `3.9400` |
| `recipe_cost(concha batch, yields 48)` | `18.9277` |
| `variant_food_cost(PAN-CONCHA)` | `0.3943` |
| Concha margin at $1.75 | `77.47%` |
| Butter `0.0095 → 0.0190` ⇒ concha cost | `0.5765` |
| `convert_qty(1, lb, g)` | `453.59237` |
| `convert_qty(g → ml)` | raises SQLSTATE `22023` |
| 8 concurrent buyers × 2 units vs 5 units | exactly **2** succeed; ledger `available 5 / reserved 4` |
| 10:00 local 2026-10-31 → stored | `14:00Z` |
| 10:00 local 2026-11-02 → stored | `15:00Z` |
| Tables without RLS enabled+forced | **0** |

---

## Commands

```bash
npm run dev            # local dev
npm run build          # must pass with 0 TS errors, 0 ESLint errors
npm run lint
npm run test           # vitest — unit + integration
npm run test:e2e       # playwright
npx supabase db reset  # re-apply schema + seed locally
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

**Do not run `playwright install`.** Chromium is already provisioned.

---

## Repo layout

```
CLAUDE.md                     this file
README.md                     order of operations + verification results
DESIGN.md                     styling source of truth
00-INTEL-AUDIT-PLAN.md        client facts, audit, plan, 28-item confirmation list
prompts/PROMPT-01..16-*.md    the build prompts, in order
supabase/migrations/          0001_schema.sql (verified), later migrations per prompt
supabase/seed.sql             demo seed — STAGING ONLY, never production
docs/                         deployment, GBP checklist, asset brief, pitch
public/brand/                 logo assets
src/                          the app (created by PROMPT-01)
```

---

## Known placeholders

| Item | Status |
|---|---|
| `public/brand/logo-mark.svg` | **Approximation.** Traced by eye from a raster logo. Replace with a proper vector trace — see `docs/ASSET-BRIEF.md` §3. The three-path structure (ring / toque / face) must be preserved; the draw animation depends on it. |
| All 45 prices | Placeholders. Blocking launch. |
| Hours | Four sources disagree. Google's set is seeded as the least-wrong default. Blocking launch. |
| Founding year | Client's own materials say "over 9 years", "three years ago", and "since the early 90's". Omit rather than guess. |
| Product photography | None exists. Shot list in `docs/ASSET-BRIEF.md`. |
| Dietary tags | Empty until the client provides them in writing. |

---

## What NOT to do

- Do not use default shadcn/Tailwind colors, or any hex outside `src/styles/tokens.css`.
- Do not put the menu in a PDF or an image.
- Do not use leader dots or an aligned price column on the menu.
- Do not write "Welcome to…" or "Bienvenidos a nuestro sitio web".
- Do not use stock or AI-generated imagery for a product a customer can order. AI imagery is for texture and atmosphere only.
- Do not translate a customer review.
- Do not gate a review request behind a satisfaction question.
- Do not send an SMS without a stamped explicit opt-in, or during quiet hours.
- Do not confirm an order, send a confirmation, or print a ticket before payment clears.
- Do not disable a failing test to make the build green.
