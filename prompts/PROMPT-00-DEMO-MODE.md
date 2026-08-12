# PROMPT 00 — DEMO MODE

> **Context: there is a live sales demo tomorrow.** This build must run with **zero external services** — no Supabase cloud, no Stripe, no Twilio, no Resend, no OAuth. `npm install && npm run dev` and it works, on a plane, on hotel wifi, on a laptop with nothing configured.
>
> Nothing built here is throwaway. Everything sits behind an interface that the real Supabase adapter implements later. When the sale closes, you flip one environment variable.

---

## ⚠ HOW TO RUN THIS — read before pasting anything

This prompt is **read first, built second.** Its constraints govern the entire project, but the files it creates (`src/lib/data/...`) cannot exist until PROMPT-01 has scaffolded the app.

**Paste this as your first message to Claude Code:**

```
Read CLAUDE.md, DESIGN.md, prompts/PROMPT-00-DEMO-MODE.md and prompts/PROMPT-01-scaffold.md.

PROMPT-00 governs this entire build. Apply its constraints to every prompt that
follows, including its Part G overrides.

Then, in this order:
  1. Execute PROMPT-01 (scaffold), applying PROMPT-00 Part G: install the
     Supabase/Stripe/Twilio/Resend packages but wire NOTHING. Skip those env vars.
  2. Execute PROMPT-00 Parts A–F: the BakeryData interface, the fixture
     generator, the demo adapter and store, the stubs, and the demo banner.

Stop and report when `npm run demo` serves /es and /en with the MODO DEMO
banner visible and the menu rendering from fixtures.
```

Then work through the rest one prompt per message, in the Part H priority order.

**You never paste `CLAUDE.md`** — Claude Code loads it automatically from the repo root.

---

## The architecture decision

All data access goes through **one interface**, `BakeryData`. Two implementations:

| Adapter | When | Backed by |
|---|---|---|
| `demoAdapter` | `NEXT_PUBLIC_DEMO_MODE=true` | Typed in-memory fixtures, mutable within the session |
| `supabaseAdapter` | otherwise | Real Postgres, RLS, the works |

**Every page, component and server action imports `db` from `src/lib/data`.** None of them know or care which adapter is behind it. That is what makes tomorrow's work permanent.

```ts
// src/lib/data/index.ts
import type { BakeryData } from './types'
import { demoAdapter } from './demo'
import { supabaseAdapter } from './supabase'

export const db: BakeryData =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? demoAdapter : supabaseAdapter

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
```

Write `supabaseAdapter` as a stub that throws `new Error('Supabase adapter not wired yet — see PROMPT-02')` for now. It gets filled in after the sale.

---

## Files to create

```
src/lib/data/types.ts              # the BakeryData interface — the contract
src/lib/data/index.ts              # the switch
src/lib/data/demo/index.ts         # demoAdapter
src/lib/data/demo/store.ts         # mutable in-memory state
src/lib/data/demo/fixtures.ts      # the data, generated from supabase/seed.sql
src/lib/demo/banner.tsx            # persistent "MODO DEMO" indicator
src/lib/demo/message-log.tsx       # the Mensajes drawer
src/lib/demo/reset.ts              # one-click reset to pristine state
src/app/api/demo/reset/route.ts
scripts/generate-fixtures.ts       # seed.sql -> fixtures.ts (run once)
.env.demo.example
```

---

## Part A — `src/lib/data/types.ts`

Define the interface from what the pages actually need. Mirror the real schema's shapes exactly — same field names, same types, same nullability — so the Supabase adapter is a drop-in later.

```ts
export interface BakeryData {
  // Menu
  getMenu(locale: Locale): Promise<MenuCategory[]>
  getCategory(slug: string, locale: Locale): Promise<MenuCategory | null>
  getProduct(slug: string, locale: Locale): Promise<Product | null>
  setEightySixed(productId: string, value: boolean): Promise<void>

  // Hours & business
  getBusiness(): Promise<Business>
  getLocation(): Promise<Location>
  getWeekHours(): Promise<WeekRow[]>
  getTodayStatus(now: Date): Promise<OpenStatus>
  getAnnouncement(locale: Locale): Promise<Announcement | null>

  // Cakes
  getCakeSizes(): Promise<CakeSize[]>
  getCakeOptions(): Promise<CakeOption[]>
  getLeadTimeRules(): Promise<LeadTimeRule[]>
  getBlackoutDates(): Promise<string[]>
  getAvailability(q: SlotQuery): Promise<AvailabilityResult>

  // Orders
  placeOrder(input: PlaceOrderInput): Promise<Order>
  getOrder(id: string): Promise<Order | null>
  getOrderByToken(token: string): Promise<Order | null>
  listOrders(filter: OrderFilter): Promise<Order[]>
  setOrderStatus(id: string, status: OrderStatus): Promise<Order>
  getDailyStock(date: string): Promise<DailyStockRow[]>

  // Bakery OS
  getIngredients(): Promise<IngredientOnHand[]>
  getRecipes(): Promise<Recipe[]>
  getRecipeCost(recipeId: string): Promise<number>
  getVariantFoodCost(variantId: string): Promise<number | null>
  getMarginTable(): Promise<MarginRow[]>
  getProductionPlan(date: string): Promise<ProductionRow[]>
  getVendors(): Promise<Vendor[]>
  getPurchaseOrders(): Promise<PurchaseOrder[]>
  getWasteLog(from: string, to: string): Promise<WasteRow[]>
  getSalesDays(from: string, to: string): Promise<SalesDay[]>
  getExpenses(from: string, to: string): Promise<Expense[]>
  getPnl(months: number): Promise<PnlRow[]>
  getCommissionSaved(): Promise<CommissionSavedRow[]>
  getKpis(period: Period): Promise<Kpis>

  // Wholesale
  getWholesaleAccounts(): Promise<WholesaleAccount[]>
  getPriceList(accountId: string): Promise<PriceListItem[]>
  getInvoices(): Promise<Invoice[]>
  getAging(): Promise<AgingRow[]>
  getRouteSheet(dow: number): Promise<RouteRow[]>

  // Messaging (demo: captured, not sent)
  sendMessage(msg: OutboundMessage): Promise<void>
  listMessages(): Promise<LoggedMessage[]>
}
```

---

## Part B — `scripts/generate-fixtures.ts`

**Do not hand-type the fixture data.** Parse `supabase/seed.sql` and emit `src/lib/data/demo/fixtures.ts` as typed constants. The seed is already verified — every product name, Spanish spelling, price, recipe quantity and vendor is correct in it, and retyping is how errors get introduced.

Run it once: `npx tsx scripts/generate-fixtures.ts`.

The fixture file must carry the same header warning as the seed: every price and cost is a placeholder pending client confirmation.

Dates in the seed are relative (`current_date + 1`). Resolve them at fixture-generation time relative to **the demo date**, and add a small helper so the demo always shows "today" and "tomorrow" correctly no matter when it runs.

---

## Part C — `src/lib/data/demo/store.ts` — mutable state

This is what makes the demo *feel alive* rather than like a set of screenshots.

```ts
// Module-level mutable state. Survives navigation, resets on server restart
// or via the reset button. Deliberately not persisted.
let state = structuredClone(PRISTINE)

export const store = {
  get: () => state,
  mutate: (fn: (s: DemoState) => void) => { fn(state) },
  reset: () => { state = structuredClone(PRISTINE) },
}
```

Mutations that **must** actually work during the demo:

- **86 a product in the portal → it disappears from the public menu.** This is the single best moment in the whole demo. Make sure it works on a real page refresh.
- Place an order → it appears in the portal order queue, and `daily_stock` decrements.
- Advance an order's status → the customer-facing status page updates.
- Log waste → the weekly waste total moves.
- Change an ingredient cost → **every affected product's food cost and margin recomputes.** Second-best moment in the demo.
- Approve a wholesale account → it moves from pending to approved and appears on the route sheet.

### Costing must be real, not hard-coded

Port `recipe_cost()` and `variant_food_cost()` from `supabase/migrations/0001_schema.sql` into TypeScript **for demo mode only**, in `src/lib/data/demo/costing.ts`, clearly marked:

```ts
// DEMO ONLY. Mirrors recipe_cost() / variant_food_cost() from
// 0001_schema.sql. The database is the source of truth in production —
// this exists so the demo runs with no database at all.
// Verified reference values (must match, see CLAUDE.md):
//   sugar-shell sub-recipe batch = 3.9400
//   concha batch (yields 48)     = 18.9277
//   concha per unit              = 0.3943  (margin 77.47%)
//   butter 0.0095 -> 0.0190      = 0.5765
```

Write a unit test asserting those four numbers. If the TypeScript port disagrees with the verified SQL, the port is wrong.

---

## Part D — Stubbed integrations

### Payments

No Stripe. A local `/pedido/pagar` page styled to look like a real checkout, with the order summary, the deposit amount, and a **"Pagar (demo)"** button that waits 1200 ms with a spinner and advances the order to `confirmed`.

Below the button, small and honest: *"Modo demo — no se cobra nada."* / *"Demo mode — no charge."* Never let the client believe a card was charged.

Card fields: render them **disabled**, showing `4242 4242 4242 4242`. Do not accept typed card input. Never build a form that collects a card number outside of Stripe Elements, not even a fake one — it teaches the wrong habit and someone will eventually type a real number into it.

### Email and SMS — the Mensajes drawer

`sendMessage()` in demo mode writes to the in-memory log instead of sending. `src/lib/demo/message-log.tsx` renders a slide-over drawer, reachable from the demo banner, showing every message that *would* have gone out — fully rendered HTML email and the SMS text, in the customer's language, with a timestamp.

**This demos better than real email.** It is instant, it shows both locales side by side, and it cannot land in spam mid-pitch.

### Auth

No OAuth, no passwords. `/portal/entrar` in demo mode shows four large role cards:

| Card | Role | Lands on |
|---|---|---|
| Mostrador | `counter` | Order queue |
| Panadero | `baker` | Production board |
| Gerente | `manager` | Admin dashboard |
| Dueña (Argentina) | `owner` | Admin dashboard, everything unlocked |

One click, no credentials. The chosen role is held in a cookie and drives the same role-gating logic the real build uses — so you can show the client, live, that the counter staff genuinely cannot see the P&L.

**Every one of these is gated behind `IS_DEMO`.** In a non-demo build the role cards do not render and the demo payment route returns 404. Add a build-time assertion that fails the production build if `NEXT_PUBLIC_DEMO_MODE=true`.

---

## Part E — The demo banner

A persistent, unmissable strip. `--wheat` background, `--ink` text, 32px tall, fixed to the top, above everything, on **every** route including the portal:

> **MODO DEMO** — datos de ejemplo · no se envían mensajes · no se cobra nada
> `[ Mensajes (3) ]  [ Reiniciar demo ]  [ ES | EN ]`

Three reasons this is non-negotiable:

1. It is honest. Nobody walks away thinking the prices or the sales figures are their real numbers.
2. **Reiniciar demo** is your safety net. If you fat-finger something in front of the client, one click restores pristine state.
3. The Mensajes and language controls are right where you need them mid-pitch.

---

## Part F — `.env.demo.example`

```
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

That is the entire file. Copy it to `.env.local` and run `npm run dev`. Nothing else is required for the demo.

Add to `package.json`:

```json
{
  "scripts": {
    "demo": "NEXT_PUBLIC_DEMO_MODE=true next dev",
    "demo:build": "NEXT_PUBLIC_DEMO_MODE=true next build",
    "demo:start": "NEXT_PUBLIC_DEMO_MODE=true next start"
  }
}
```

---

## Part G — How the rest of the prompts change

Run PROMPT 01 → 16 as written, with these overrides:

| Prompt | Override |
|---|---|
| 01 | Skip the Supabase/Stripe/Twilio/Resend env vars. Install the packages — they're needed later — but wire nothing. |
| 02 | **Do not run against Supabase cloud.** Keep `0001_schema.sql` and `seed.sql` in the repo as-is; they are the fixture source and they go live after the sale. |
| 03–06 | Unchanged. All data comes from `db`. |
| 07 | Availability engine is unchanged and fully real — it's pure logic over fixture data. The DST tests still pass. |
| 08 | Checkout goes to the demo pay page instead of Stripe. Everything before and after it is real. |
| 09–13 | Unchanged. Reads and writes go through `db` against the mutable store. |
| 14 | Templates rendered in full — into the Mensajes drawer instead of over the wire. |
| 15 | Unchanged. Schema, metadata and hreflang are all static output. |
| 16 | Run the unit tests (availability, costing, hours, money, datetime). Skip the integration/RLS/webhook suites — there is no database yet. **Do not delete them.** |

---

## Part H — Priority order for tomorrow

If you run out of time, this is the order that matters. A demo that nails the first four beats a demo that limps through all nine.

Run **one prompt per message**. Let each finish and build clean before the next.

| Order | Paste | Why it matters in the room |
|---|---|---|
| **1** | `PROMPT-03-home.md` | The three-second test. The sale is won or lost here. |
| **2** | `PROMPT-04-menu.md` | Sectioned, photographed, bilingual, searchable. The thing they have never had, and no competitor has either. |
| **3** | `PROMPT-05-cakes.md` | The cake pages. Needed so the configurator has somewhere to live. Keep it tight. |
| **4** | `PROMPT-07-cake-configurator.md` | All seven steps. The lead time changing as they choose is the moment they realize it's a system. |
| **5** | `PROMPT-08-pickup-ordering.md` | Only the demo pay page and the order-status page. Skip the Stripe half entirely. |
| **6** | `PROMPT-12-finance.md` | Admin dashboard, KPIs, P&L, commission-saved card. The "I didn't know I could see that" moment — this one is for the sons. |
| **7** | `PROMPT-11-recipes-food-cost.md` | The margin table and the ingredient-shock simulator. Ask them what a concha costs to make and wait. |
| **8** | `PROMPT-09-staff-portal.md` | Production board + the 86 toggle. Then flip to the public menu and show it gone. |
| **9** | `PROMPT-13-wholesale.md` | Line sheet, standing order, printed route sheet, aging. The 250-store story. |
| **10** | `PROMPT-14-notifications.md` | Templates rendered into the Mensajes drawer. |
| 11 | `PROMPT-06`, `PROMPT-10`, `PROMPT-15` | If there is time. None of these carry the demo. |

**Skip entirely for the demo:** `PROMPT-02` (keep the SQL files on disk — they're the fixture source, and they go live after the sale) and `PROMPT-16`'s integration, RLS and webhook suites (no database yet — run the unit tests only, and **do not delete** the rest).

If you get through 1–6, you have a demo that closes. Everything after that is upside.

---

## Acceptance criteria

- [ ] `cp .env.demo.example .env.local && npm install && npm run dev` produces a working site with **no other configuration**.
- [ ] Airplane mode: the entire demo runs with wifi off. Test this literally.
- [ ] `grep -r "supabase.co\|api.stripe.com\|api.twilio.com\|api.resend.com" src/` finds nothing reachable in a demo-mode render.
- [ ] Zero network requests to any third-party domain — check the Network tab with the filter on.
- [ ] 86'ing a product in the portal removes it from the public menu on refresh.
- [ ] Changing butter's cost in admin moves the concha margin on the costs screen.
- [ ] Costing unit test passes: `3.9400`, `18.9277`, `0.3943`, `0.5765`.
- [ ] Placing an order appears in the portal queue and decrements daily stock.
- [ ] The Mensajes drawer shows the confirmation email and SMS, fully rendered, in both languages.
- [ ] Role cards gate correctly — `counter` cannot reach `/admin`.
- [ ] "Reiniciar demo" restores pristine state in under a second.
- [ ] The demo banner is visible on every route, including the portal and admin.
- [ ] Both locales work; check `/es` first.
- [ ] Lighthouse mobile ≥ 95 on the home page and the menu. **The client will open this on their phone.**
- [ ] A production build with `NEXT_PUBLIC_DEMO_MODE=true` **fails** with a clear error.
- [ ] Every price on screen still carries its "pending confirmation" treatment.

## What NOT to do

- Do not create a Supabase, Stripe, Twilio or Resend account for this demo.
- Do not build a form that accepts a typed card number, even a fake one.
- Do not let the client believe a payment was processed or a message was sent.
- Do not hard-code a food cost or a margin. Port the real functions and test them against the verified values.
- Do not hand-type the fixture data. Generate it from `seed.sql`.
- Do not delete the integration, RLS or webhook tests. They run after the sale.
- Do not let demo-only code (role cards, demo pay route) render in a non-demo build.
- Do not remove the price-confirmation flags to make the demo look cleaner. Showing the client that the system refuses to publish an unconfirmed price is a **selling point**, not a blemish.
