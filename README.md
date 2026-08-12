# La Sabrosita Bakery — Build Package

Website + Bakery OS for **La Sabrosita Bakery**, 7730 Midlothian Turnpike Ste A, Richmond, VA 23235.
Build target: **Cursor AI agents + Claude Code**. Stack: Next.js 15 · TypeScript · Tailwind v4 · Supabase · Stripe · Vercel.

---

## Read in this order

| # | File | What it is |
|---|---|---|
| — | `CLAUDE.md` | **Auto-loaded by Claude Code and Cursor.** Standing rules that apply to every task in the repo. You don't paste this — it loads itself. |
| **★** | **`prompts/PROMPT-00-DEMO-MODE.md`** | **RUN THIS FIRST.** Builds the whole thing with zero external services for the sales demo. Nothing is throwaway — one env flag swaps in real Supabase later. |
| **★** | **`docs/DEMO-RUNBOOK.md`** | The 12-minute demo script. Read it the night before. |
| 0 | `00-INTEL-AUDIT-PLAN.md` | Verified client facts, sampled brand tokens, the scored audit (2.3/10), competitive landscape, the plan, and the 28-item confirmation list |
| 1 | `DESIGN.md` | **The styling source of truth.** Every agent reads this before writing CSS |
| 2 | `prompts/PROMPT-01-scaffold.md` | Project scaffold, bilingual routing, theme |
| 3 | `prompts/PROMPT-02-database.md` | Full schema + RLS + demo seed — **verified against PostgreSQL 16** |
| 4 | `prompts/PROMPT-03-home.md` | Shell, signature motion, ten-chamber home page |
| 5 | `prompts/PROMPT-04-menu.md` | The bilingual menu system |
| 6 | `prompts/PROMPT-05-cakes.md` | Cake pages and gallery |
| 7 | `prompts/PROMPT-06-content-pages.md` | Story, Visit, Catering, Gift Cards, Careers, FAQ, error states |
| 8 | `prompts/PROMPT-07-cake-configurator.md` | Cake configurator + the lead-time availability engine |
| 9 | `prompts/PROMPT-08-pickup-ordering.md` | Everyday pickup ordering, cart, Stripe |
| 10 | `prompts/PROMPT-09-staff-portal.md` | Production board, order queue, waste log, realtime, offline |
| 11 | `prompts/PROMPT-10-inventory.md` | Inventory, unit conversions, vendors, purchase orders |
| 12 | `prompts/PROMPT-11-recipes-food-cost.md` | Recipes, BOM, food cost, margin, price simulator |
| 13 | `prompts/PROMPT-12-finance.md` | Daily sales, expenses, P&L, owner dashboard |
| 14 | `prompts/PROMPT-13-wholesale.md` | The wholesale portal |
| 15 | `prompts/PROMPT-14-notifications.md` | Every email and SMS template, in full, both languages |
| 16 | `prompts/PROMPT-15-seo-schema.md` | SEO, structured data, metadata, analytics |
| 17 | `prompts/PROMPT-16-qa-hardening.md` | QA, hardening, definition of done |
| — | `docs/DEPLOYMENT-AND-HANDOFF.md` | Accounts, env vars, DNS, launch sequence, client admin guide |
| — | `docs/GBP-CHECKLIST.md` | Google Business Profile — **do this in week one, it's free** |
| — | `docs/ASSET-BRIEF.md` | Photography shot list + Higgsfield prompts |
| — | `docs/PITCH-MONEY-MATH.md` | The one-pager for the owner |
| — | `sql/schema.sql`, `sql/seed.sql` | The verified SQL, standalone |

Each prompt is self-contained and pasteable on its own. Run them in order — each states its dependencies.

---

## ⚡ Demo tomorrow — the short version

```bash
cp .env.demo.example .env.local
npm install
npm run demo
```

Two environment variables, no accounts, works with wifi off.

**First message to Claude Code — paste exactly this:**

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

Then one prompt per message in the **PROMPT-00 Part H** order: 03 → 04 → 05 → 07 → 08 → 12 → 11 → 09 → 13 → 14.

You never paste `CLAUDE.md` — Claude Code loads it automatically.

Read `docs/DEMO-RUNBOOK.md` the night before.

After the sale: set `NEXT_PUBLIC_DEMO_MODE=false`, wire `.env.local.example`, run PROMPT-02 against real Supabase. The interface doesn't change.

---

## Verification status

The SQL in `PROMPT-02` was **executed end-to-end against PostgreSQL 16.13** before it was written into the package. Not reviewed — run.

| Test | Result |
|---|---|
| Schema applies | 55 tables, 7 views, 73 RLS policies, **0 errors** |
| RLS coverage | **0** tables without RLS enabled and forced |
| Seed applies | 15 orders, 89 sales days, 5 invoices, 0 errors |
| Food cost — sugar-shell sub-recipe | `$3.9400` — matches hand calculation |
| Food cost — concha batch (48) | `$18.9277` — matches hand calculation |
| Food cost — per concha | `$0.3943`, margin `77.47%` |
| Cost ripple | Butter `$0.0095 → $0.0190` moves concha to `$0.5765` |
| Unit conversion | `lb → g = 453.59237`; mass→volume raises SQLSTATE `22023` |
| **Concurrency** | 8 simultaneous buyers × 2 units vs 5 units → **exactly 2 succeeded**, ledger `available 5 / reserved 4`. **Zero overselling.** |
| **DST** | 10:00 local on 2026-10-31 stores `14:00Z`; 2026-11-02 stores `15:00Z`; both render back as 10:00 local |
| P&L | Food cost 22–34%, labor and prime cost compute correctly; partial months labelled |
| Aging | All five buckets populate correctly |

Brand tokens in `DESIGN.md` were **sampled pixel-by-pixel** from the client's logo file, and every contrast pairing was computed rather than estimated. Two WCAG failures were caught and closed in the token set (raw accent as body text on paper = 3.58:1; white on the dark-mode accent = 2.89:1).

---

## Decisions already made

| Decision | Choice |
|---|---|
| Design direction | **Wispr Flow** — cream broadsheet, dark velvet chambers |
| Portal styling | **Seline Analytics** — quiet analyst's desk on warm paper |
| Cakes sub-pages | ORYZO-style darkroom editorial, the one deliberate tonal shift |
| Order flow | Cake configurator + everyday pickup ordering, Stripe deposits |
| Backend | Full Bakery OS — inventory, recipes/BOM, food cost, production, vendors, waste, sales, expenses, P&L |
| Language | **Bilingual ES/EN from day one. Spanish is the default locale.** |
| Admin portal | Also bilingual — the owner works in Spanish |
| 3D | None. A bakery menu does not earn React Three Fiber. |

---

## Before anything ships

Two things gate launch, and neither requires code:

1. **The hours.** Four sources disagree — the website says 9 PM, Google says 8 PM, Facebook says 8 PM, DoorDash says 7:10 PM. People are showing up to a closed door.
2. **All 45 prices.** The published list is roughly 50% of current. Their site says Quesadilla Salvadoreña Entera is $6.80; DoorDash says $13.99.

The full list is §7 of `00-INTEL-AUDIT-PLAN.md` — 28 items, grouped by whether they block launch.

The build enforces this: `CONFIRM_WITH_CLIENT()` throws at production build time, so an unconfirmed fact **cannot** ship.

---

## The four findings that drive everything

1. **The Google Business Profile is unclaimed** — 4.3★, 663 reviews, sitting under a "Claim this business" link. Free, week one.
2. **The ~250-store wholesale book has zero digital surface** — no line sheet, no portal, no reorder form. Highest-leverage feature in the project.
3. **The current site has no conversion mechanisms at all** — measured live: `forms=0`, `buttons=0`, `h1=0`, `jsonLd=0`, `ogTags=0`.
4. **No competitor in this market has a real website** — El Globo (4.6/290), El Sol (4.1/145), Las Delicias (4.7/91) are all Facebook-only. The category is undefended.
