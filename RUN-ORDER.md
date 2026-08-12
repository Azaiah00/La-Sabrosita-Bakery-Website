# RUN ORDER — copy one block per message into Claude Code

**You never open the prompt files.** They live in `prompts/` in this repo. Claude Code reads them from disk itself — you just tell it which one to execute.

Open a terminal in `C:\Users\azaia\OneDrive\La-Sabrosita-Bakery-Website`, run `claude`, and go.

---

## Before you start

Create `.env.local` in the project root with exactly two lines:

```
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Message 1 — scaffold + demo data layer

```
Read CLAUDE.md, DESIGN.md, prompts/PROMPT-00-DEMO-MODE.md and prompts/PROMPT-01-scaffold.md.

PROMPT-00 governs this entire build. Apply its constraints to every prompt that
follows, including its Part G overrides.

Then, in this order:
  1. Execute PROMPT-01 (scaffold), applying PROMPT-00 Part G: install the
     Supabase/Stripe/Twilio/Resend packages but wire NOTHING. Skip those env vars.
  2. Execute PROMPT-00 Parts A-F: the BakeryData interface, the fixture
     generator, the demo adapter and store, the stubs, and the demo banner.

Stop and report when `npm run demo` serves /es and /en with the MODO DEMO
banner visible and the menu rendering from fixtures.
```

**Checkpoint:** `npm run demo` → `localhost:3000` redirects to `/es`, banner visible. **Do not continue until this works.**

---

## Message 2 — Home page

```
Execute prompts/PROMPT-03-home.md. Demo mode: all data through `db` from src/lib/data.
```

**Checkpoint:** `/es` shows the hero, the proof strip, the six product cards, and the sticky mobile bar. Check it at phone width.

---

## Message 3 — Menu

```
Execute prompts/PROMPT-04-menu.md.
```

**Checkpoint:** `/es/menu` lists all six categories with real products. Search `concha`, `quesadilla`, `tres leches`. Toggle to `/en/menu`.

---

## Message 4 — Cake pages

```
Execute prompts/PROMPT-05-cakes.md. Keep it tight — the sub-pages just need to
exist and look good; the configurator in the next prompt is the priority.
```

**Checkpoint:** `/es/pasteles` and the three sub-pages render with the size table.

---

## Message 5 — Cake configurator ⭐ the centerpiece

```
Execute prompts/PROMPT-07-cake-configurator.md.

Demo mode overrides:
- Skip Part B (the SQL migration). Implement claim_pickup_slot's capacity check
  in the demo adapter instead.
- Step 7 goes to the demo pay page from PROMPT-00 Part D, not Stripe.
- The availability engine itself is fully real — build it exactly as specified,
  including the DST handling and the unit tests.
```

**Checkpoint:** Quinceañera → 2 pisos → fondant → the lead time visibly jumps to 7+ days, with the reason shown. Inscription with an accent (`Felices 15, Sofía`) survives to the review step.

---

## Message 6 — Demo checkout + order status

```
Execute prompts/PROMPT-08-pickup-ordering.md, but ONLY these parts:
- the ordering page and cart
- the pickup slot picker
- the demo pay page
- the /pedido/[token] order status page

Skip everything Stripe: no webhook route, no checkout session, no
processed_stripe_events table. The demo pay button advances the order directly.
```

**Checkpoint:** Add items → pick a slot → demo pay → order status page loads.

---

## Message 7 — Admin dashboard ⭐ this one is for the sons

```
Execute prompts/PROMPT-12-finance.md. Read the dataviz guidance before writing
chart code. All figures come from the demo fixtures via `db`.
```

**Checkpoint:** `/admin` shows the KPI tiles, the P&L, and the commission-saved card. Charts use brand colors, not Recharts defaults.

---

## Message 8 — Food cost + simulator ⭐

```
Execute prompts/PROMPT-11-recipes-food-cost.md.

Verify against the reference values in CLAUDE.md before you report done:
sugar-shell 3.9400, concha batch 18.9277, per-unit 0.3943, margin 77.47%,
butter 0.0095 -> 0.0190 gives 0.5765.
```

**Checkpoint:** `/admin/costos` shows the margin table. The simulator moves butter 15% and every affected margin changes.

---

## Message 9 — Staff portal + the 86 board ⭐

```
Execute prompts/PROMPT-09-staff-portal.md.

Demo mode: skip Supabase Realtime and the offline queue. Auth is the four role
cards from PROMPT-00 Part D. The 86 toggle MUST update the public menu — that's
the key demo moment.
```

**Checkpoint:** 86 the flan in the portal → refresh `/es/menu` → **it's gone.** If this doesn't work, stop and fix it. It's the best 20 seconds in the demo.

---

## Message 10 — Wholesale

```
Execute prompts/PROMPT-13-wholesale.md.
```

**Checkpoint:** The line sheet is in cases. The route sheet prints in delivery order. The aging table shows all five buckets.

---

## Message 11 — Messages drawer

```
Execute prompts/PROMPT-14-notifications.md.

Demo mode: every template renders in full into the Mensajes drawer from
PROMPT-00 Part E instead of sending. No Resend, no Twilio, no cron routes.
```

**Checkpoint:** Place an order → open Mensajes → the confirmation email and SMS are there, in Spanish, fully rendered.

---

## If you have time left

```
Execute prompts/PROMPT-06-content-pages.md.
```
```
Execute prompts/PROMPT-15-seo-schema.md.
```

**Skip entirely for the demo:** `PROMPT-02` (no database yet — leave the SQL files on disk, the fixture generator reads them), `PROMPT-10` (inventory admin), `PROMPT-16` (run the unit tests only if you touch them at all).

---

## The pre-flight check

Before you close the laptop:

- [ ] `npm run demo` from a clean terminal
- [ ] **Turn wifi off. Run the whole demo again.** Bakery wifi will betray you.
- [ ] `/es` and `/en` both render at phone width
- [ ] 86 the flan → it disappears from the menu → un-86 it
- [ ] Complete a cake order end to end
- [ ] Open the Mensajes drawer
- [ ] Click **Reiniciar demo** and confirm it resets clean
- [ ] Know where the reset button is without looking
- [ ] Read `docs/DEMO-RUNBOOK.md`

---

## If something breaks mid-build

Paste the error and add:

```
Fix this without violating CLAUDE.md or DESIGN.md. Do not disable a test,
do not add a hex value outside tokens.css, and do not switch to a non-demo
data path.
```

## If you fall behind

Stop after **Message 8**. Home + Menu + Configurator + Dashboard + Food cost is a demo that closes. A polished five beats a broken eleven — and the parts you skip are all back-office screens the client hasn't imagined yet anyway.
