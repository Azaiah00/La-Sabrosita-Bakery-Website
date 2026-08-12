# PROMPT 03 — Home page, shell, and the signature motion

> Requires PROMPT 01 and 02. Read `DESIGN.md` before starting.

---

## Goal

Build the app shell (header, language toggle, sticky mobile bar, footer), the signature logo animation, and the ten-chamber home page, in both locales, hitting Lighthouse ≥ 95 mobile.

## Files to create

```
src/components/marketing/site-header.tsx
src/components/marketing/language-toggle.tsx
src/components/marketing/sticky-mobile-bar.tsx
src/components/marketing/site-footer.tsx
src/components/marketing/announcement-bar.tsx
src/components/marketing/chamber.tsx
src/components/marketing/product-card.tsx
src/components/marketing/proof-strip.tsx
src/components/marketing/review-quote.tsx
src/components/motion/logo-draw.tsx
src/components/motion/scroll-provider.tsx
src/components/motion/reveal.tsx
src/components/motion/split-headline.tsx
src/components/motion/count-up.tsx
src/app/[locale]/page.tsx
src/messages/es.json
src/messages/en.json
```

## The shell

**Header.** Transparent over the dark hero, solid `--surface` with a `--line` bottom border once scrolled past 80px. Left: the circular baker mark (SVG) + wordmark. Center (desktop only): Menú · Pasteles · Mayoreo · Nuestra Historia · Visítanos. Right: language toggle + a primary "Pedir un Pastel" button. Mobile: mark + toggle + a hamburger opening a shadcn `Sheet`.

**Language toggle.** Two pills, `ES` / `EN`, `--radius-pill`, active one filled `--accent` with `--accent-ink`. Switching preserves the current route through `next-intl`'s `pathnames` map and writes a `NEXT_LOCALE` cookie. It is a real route change, not client-side string swapping.

**Sticky mobile bar.** Fixed bottom, `--surface`, `2px solid var(--ink)` top border, `padding-bottom: env(safe-area-inset-bottom)`. Four equal 48px targets:

| | ES | EN | Action |
|---|---|---|---|
| 1 | Pedir | Order | `/[locale]/pedir` |
| 2 | Menú | Menu | `/[locale]/menu` |
| 3 | Llamar | Call | `tel:+18049869695` |
| 4 | Cómo llegar | Directions | Google Maps to the Plus Code `FFX5+HX Richmond, Virginia` |

Visible on every public page below `md`. Hidden above.

**Footer.** Dark chamber. Three columns on desktop, stacked on mobile: (1) NAP with a `tel:` link and a `mailto:`, (2) hours table rendered from the database, (3) nav + social. Bottom row: legal name, copyright, and an accessibility statement link.

**Announcement bar.** Renders the active row from `announcements`, `--wheat` background with `--ink` text. Dismissible, dismissal stored in `localStorage`. Hidden entirely when no row is active.

## Signature motion — `logo-draw.tsx`

Inline SVG of the circular baker mark. Three paths: the ring, the toque, the face. Animate with GSAP `stroke-dasharray`/`stroke-dashoffset`, ring → toque → face, total 900ms, `power2.out`.

- Runs **once per session** — gate on `sessionStorage.getItem('ls-logo-drawn')`.
- Under `prefers-reduced-motion: reduce`, render the final state immediately with no animation.
- It is also the route-transition glyph and the divider between chambers, at 32px.

If a clean SVG of the mark does not exist yet, build the component against a placeholder SVG with the same three-path structure and a `TODO: replace with traced mark` comment. Do not block on the asset.

## `scroll-provider.tsx`

Client component. Initializes Lenis, registers GSAP ScrollTrigger, and wires `lenis.on('scroll', ScrollTrigger.update)`. Both libraries are **dynamically imported** so they never enter the initial bundle. Under reduced motion, Lenis is not initialized at all and native scrolling is used.

## `chamber.tsx`

```tsx
type ChamberProps = {
  tone: 'paper' | 'paper-alt' | 'dark' | 'wheat'
  children: React.ReactNode
  id?: string
  className?: string
}
```

Full-bleed band. `border: 2px solid var(--ink)`, `border-radius: var(--radius-xl)` below `md` and `var(--radius-2xl)` above. `tone="dark"` sets `data-theme="dark"` on the wrapper so every child token flips automatically. Vertical padding `--space-9` mobile / `--space-11` desktop. **Never render two `dark` chambers adjacent.**

## The home page — ten chambers, in this order

### 1 · Hero — dark

Background: the hero food image, warm-graded, `priority`, AVIF with WebP fallback, under 180 KB, with a `linear-gradient(to top, rgb(22 19 15 / .85), rgb(22 19 15 / .35))` scrim so text contrast holds.

Copy — **ES:**
> **Eyebrow:** Panadería · Richmond, Virginia
> **H1:** Pan dulce, tres leches y pasteles hechos a mano cada mañana.
> **Sub:** En Midlothian Turnpike desde [AÑO]. Las conchas salen del horno a las 7.
> **Primary CTA:** Pedir un pastel → `/es/pasteles/pedir`
> **Secondary CTA:** Ver el menú → `/es/menu`
> **Below the CTAs, no scrolling required:** Abierto hoy 7:00 a.m. – 8:00 p.m. · 7730 Midlothian Turnpike

Copy — **EN:**
> **Eyebrow:** Latin Bakery · Richmond, Virginia
> **H1:** Pan dulce, tres leches, and cakes made by hand every morning.
> **Sub:** On Midlothian Turnpike since [YEAR]. Conchas out of the oven by 7.
> **Primary CTA:** Order a cake → `/en/cakes/order`
> **Secondary CTA:** See the menu → `/en/menu`
> **Below:** Open today 7:00 AM – 8:00 PM · 7730 Midlothian Turnpike

`[AÑO]` / `[YEAR]` and the hours both render through `CONFIRM_WITH_CLIENT`. The hours string is computed from `opening_hours` + `special_hours` server-side for today's date in `America/New_York` — never hard-coded, and it must say "Cerrado hoy" / "Closed today" when appropriate.

The H1 is **server-rendered and visible before any JavaScript runs.** SplitText enhances it; it does not create it. This is the LCP element and no motion library may touch the main thread before it paints.

Steam: two masked SVG paths drifting `y: -40px` with `opacity .35 → 0`, 6s and 7.4s loops, offset. Stopped entirely under reduced motion.

### 2 · Proof — paper

One row, four items, hairline dividers. All figures are real and sourced:

| Figure | ES label | EN label |
|---|---|---|
| **4.3 ★** | 663 reseñas en Google | 663 Google reviews |
| **Richmond Magazine** | Reseñado en | Featured in |
| **[N] años** | Familia Ortega en Richmond | The Ortega family in Richmond |
| **250+** | tiendas surtidas en VA y NC | stores supplied across VA and NC |

The rating and review count animate with `count-up.tsx`, once, 1.2s. `[N]` runs through `CONFIRM_WITH_CLIENT`. The "250+" figure comes from the client's own About page and must be re-confirmed before launch — flag it the same way.

### 3 · The Case — dark

Heading **ES:** *Lo que sale del horno* · **EN:** *Straight out of the oven*

Six product cards, pulled live from `products` joined to `product_variants`, filtered to a `is_featured` flag or the six hero slugs: `tres-leches`, `quesadilla-salvadorena`, `concha`, `flan`, `chicharron-guayaba`, `dona`.

Each card: real photo (4:3), Spanish name in display 500, English gloss beneath in `--t-small` `--ink-muted`, two-line description, price bottom-right with `tabular-nums`. Cards "plate" in on scroll — `y: 12px → 0`, `scale: .985 → 1`, 480ms, 60ms stagger.

An 86'd product renders at 55% opacity with a `--danger` chip: *"Se acabó por hoy"* / *"Sold out today."*

### 4 · Story — paper

Two columns on desktop, stacked on mobile. Left: the existing family photograph (four family members in front of the store) with proper bilingual alt text. Right, three short paragraphs in the family's voice — first person, not the third-person newspaper article currently on their site:

**ES:**
> Argentina Ortega empezó horneando en su propia cocina y vendiendo pan a cuatro clientes.
>
> Hoy la panadería ocupa 5,000 pies cuadrados en Midlothian Turnpike, y surtimos pan dulce a tiendas en Virginia, la Costa Este y Elizabeth City, Carolina del Norte.
>
> Seguimos haciendo todo a mano, cada mañana, con las mismas recetas.

**EN:**
> Argentina Ortega started out baking in her own kitchen, selling bread to four customers.
>
> Today the bakery fills 5,000 square feet on Midlothian Turnpike, and we supply pan dulce to stores across Virginia, the Eastern Shore, and Elizabeth City, North Carolina.
>
> We still make everything by hand, every morning, from the same recipes.

CTA: *Conoce nuestra historia* → `/es/nuestra-historia`.

### 5 · Menu entry — paper

Tabbed preview across the six categories (Pan Dulce · Pasteles y Postres · Quesadilla Salvadoreña · Pan Salado · Hojaldres · Donas y Galletas). Each tab shows four items as rows. Framer Motion `layoutId` underline on the active tab, 240ms spring. CTA: *Ver el menú completo*.

### 6 · Cakes — dark

The highest-ticket band. Heading **ES:** *Pasteles para el día que importa* · **EN:** *Cakes for the day that matters.*
Three cards: Quinceañera · Bodas · Cumpleaños, each with a real cake photograph and a lead-time line pulled from `cake_sizes.min_lead_hours` (e.g. *"7 días de anticipación"*). Primary CTA: *Diseñar tu pastel* → the configurator.

### 7 · Wholesale — wheat

The band nobody else in this market has.

**ES:** *¿Tienes una tienda?* — Surtimos pan dulce fresco a más de 250 tiendas en Virginia, la Costa Este y Carolina del Norte. Entregas semanales por ruta. → **Abrir una cuenta de mayoreo**
**EN:** *Do you run a store?* — We supply fresh pan dulce to more than 250 stores across Virginia, the Eastern Shore, and North Carolina. Weekly route delivery. → **Open a wholesale account**

### 8 · Reviews — paper

Three real, dated, attributed quotes. Use exactly these and no others until the client approves more:

- *"Great prices, delicious food, and it felt like family there!"* — Google
- *"Got my wife's tres leches birthday cake from them. Very affordable, beautifully decorated and delicious."* — Ricky Magner, Google
- *"The cake was phenomenal, moist, and beautiful."* — Tripadvisor, Nov 2024

Each quote carries its source and, where known, its date. **Do not invent, paraphrase, translate, or embellish a review.** Spanish-locale visitors see the English original with a small `lang="en"` attribute — a translated review is a fabricated review.

### 9 · Visit — paper

Static map image (not an interactive embed — it costs LCP) linking out to Google Maps directions. Address, both phone numbers with `tel:` links and clear labels, the full weekly hours table rendered from the database with today highlighted, and parking/access notes.

### 10 · Order band — dark

Closing CTA. **ES:** *El pan sale a las 7. Pide el tuyo.* **EN:** *Bread's out at 7. Order yours.* Primary CTA plus the phone number.

## Acceptance criteria

- [ ] Lighthouse mobile ≥ 95 on `/es` and `/en`, all four categories.
- [ ] LCP < 2.0s, CLS < 0.05, INP < 200ms.
- [ ] The H1 is present in the server-rendered HTML — verify with `curl -s localhost:3000/es | grep -o '<h1.*</h1>'`.
- [ ] Exactly one `<h1>` per page; no skipped heading levels.
- [ ] Zero console errors or warnings.
- [ ] Every image has descriptive bilingual alt text. No empty `alt` on a content image.
- [ ] Keyboard-only pass reaches every interactive element with a visible focus ring; the sheet menu traps focus correctly and returns it on close.
- [ ] `prefers-reduced-motion: reduce` — steam stops, logo resolves instantly, all reveals render final state, Lenis is not initialized.
- [ ] Both locales render with no layout break. **Check `/es` first** — Spanish strings are longer and are the constraint.
- [ ] Hours reflect the database, including a "Closed today" state, and are correct in `America/New_York`.
- [ ] No horizontal overflow at 320px width.

## What NOT to do

- Do not animate `width`, `height`, `top`, `left`, or `box-shadow`. `transform` and `opacity` only.
- Do not run GSAP before LCP paints.
- Do not use an interactive Google Maps embed on the home page.
- Do not hard-code hours, prices, or product names in JSX. All of it comes from the database.
- Do not translate a customer review.
- Do not put more than two visible motion effects in one viewport.
- Do not write "Bienvenidos" or "Welcome to" anywhere.
