# DESIGN.md — La Sabrosita Bakery

**This file is the styling source of truth.** Every coding agent working in this repo follows it. If a component choice is not covered here, the answer is the closest thing that is — never a library default.

Base style: **Wispr Flow** (Refero Styles — *"cream broadsheet, dark velvet chambers"*, `styles.refero.design/style/ac53825c-1e06-4ae0-8489-cace5c5e0339`), merged with brand tokens sampled pixel-by-pixel from the client's logo.
Portal style: **Seline Analytics** (Refero Styles — *"quiet analyst's desk on warm paper"*, `styles.refero.design/style/7967c6d9-e50c-42b5-b4d1-74003ba41781`), with its cyan accent replaced by our terracotta.

---

## 1. The idea in one paragraph

A cream broadsheet with dark velvet rooms cut into it. The page alternates between **bright cream chambers** (menu, story, visit) and **near-black chambers** (hero, the case, the closing CTA), separated by 2px ink borders and oversized corner radii so each section reads as a rounded object set on a counter rather than a strip of a scrolling page. Display type is a warm old-style serif at magazine scale — it commands by size, not by weight. One confident accent, `#D16639`, sampled from the baker's circle in their own logo: the color of caramelized sugar. Everything else is paper, ink, and wheat.

The three-second test: within three seconds a first-time visitor on a phone knows this is a Latin bakery, that it is on Midlothian Turnpike, that the bread came out of the oven this morning, and how to order a cake.

---

## 2. Color tokens

Sampled values are marked. **Do not re-derive them.** `#D16639`, `#E2AA67` and `#191918` were measured from the client's logo file, not estimated.

```css
:root {
  /* Light — the default. Warm paper. */
  --bg:            #FDFBF6;
  --bg-alt:        #F6EFE2;
  --surface:       #FFFFFF;
  --surface-sunk:  #F1E7D6;
  --ink:           #191918;   /* SAMPLED */
  --ink-muted:     #6B6157;
  --line:          #E4D8C4;   /* decorative hairlines only */
  --line-strong:   #A88F62;   /* functional borders: inputs, controls */

  --accent:        #D16639;   /* SAMPLED — fills, badges, large display type */
  --accent-ink:    #191918;   /* text ON --accent */
  --accent-strong: #B85328;   /* filled buttons w/ white text; accent link text */
  --accent-hover:  #9E4420;
  --accent-soft:   #F7E3D6;

  --wheat:         #E2AA67;   /* SAMPLED */
  --wheat-soft:    #F3E0C4;

  --success:       #3F6B43;
  --warn:          #C98A16;   /* pair with --ink, never white */
  --danger:        #A83232;
  --info:          #3F6F86;
}

[data-theme="dark"] {
  --bg:            #16130F;
  --bg-alt:        #1F1A15;
  --surface:       #241E18;
  --surface-sunk:  #120F0C;
  --ink:           #F7F1E6;
  --ink-muted:     #B7A996;
  --line:          #382E24;
  --line-strong:   #7A6850;

  --accent:        #E8794A;
  --accent-ink:    #16130F;   /* DARK ink on the accent. Never white. */
  --accent-strong: #E8794A;
  --accent-hover:  #F08E62;
  --accent-soft:   #33211A;

  --wheat:         #E2AA67;
  --wheat-soft:    #3A2C1C;

  --success:       #6FA873;
  --warn:          #E0AC46;
  --danger:        #D96B6B;
  --info:          #7FA9BF;
}
```

### 2.1 Contrast — computed, not estimated

| Pairing | Ratio | Verdict |
|---|---|---|
| `--ink` on `--bg` | 17.01:1 | AAA |
| `--ink` on `--bg-alt` | 15.39:1 | AAA |
| `--ink-muted` on `--bg` | 5.85:1 | AA |
| `--ink` on `--accent` | 4.75:1 | AA — **the default button treatment** |
| `#FFFFFF` on `--accent-strong` | 4.88:1 | AA |
| `#FFFFFF` on `--accent-hover` | 6.36:1 | AA |
| `--accent-strong` as link text on `--bg` | 4.72:1 | AA |
| `--ink` on `--wheat` | 8.53:1 | AAA |
| `--line-strong` on `--bg` (non-text) | 3.00:1 | AA non-text |
| dark `--ink` on dark `--bg` | 16.47:1 | AAA |
| dark `--accent` as text on dark `--bg` | 6.41:1 | AA |
| dark `--accent-ink` on dark `--accent` | 6.41:1 | AA |
| dark `--line-strong` on dark `--surface` | 3.08:1 | AA non-text |

### 2.2 Two hard rules

1. **Raw `#D16639` is never body text on paper** — it is 3.58:1 and fails AA. Accent-colored text resolves to `--accent-strong`.
2. **White is never placed on the dark-mode accent `#E8794A`** — 2.89:1, a hard fail. On dark, text on the accent is `--accent-ink`.

Both rules are encoded in the tokens. Use the tokens and you cannot get this wrong.

### 2.3 Color usage discipline

- **One accent.** `--accent` appears on: the primary CTA, the active nav item, the price badge on a hero product, section eyebrows, and the sugar-shell scoring in the signature animation. Nowhere else.
- `--wheat` is the *secondary warm*: chamber dividers, the announcement bar, the wholesale band, decorative rules. Never a CTA.
- Status colors appear **only** in the portal and in order-state chips. Never decoratively on the marketing site.
- **No gradients on text.** No purple, no blue, no default Tailwind palette anywhere. If a component ships with `indigo-500`, it is wrong.

---

## 3. Typography

| Role | Family | Weights | Source |
|---|---|---|---|
| Display | **EB Garamond** | 400, 500, 600 + italics | Google Fonts (`next/font/google`) |
| UI / body / numerals | **Figtree** | 400, 500, 600, 700 | Google Fonts |

Load both with `next/font/google`, `display: 'swap'`, `subsets: ['latin','latin-ext']`. **`latin-ext` is mandatory** — *Quesadilla Salvadoreña*, *Piñata*, *Quinceañera*, *Budín* all need it.

```css
--font-display: var(--font-eb-garamond), Georgia, 'Times New Roman', serif;
--font-ui:      var(--font-figtree), system-ui, -apple-system, 'Segoe UI', sans-serif;
```

### 3.1 Scale (mobile → desktop, fluid via `clamp`)

| Token | Size | Family | Tracking | Leading |
|---|---|---|---|---|
| `--t-hero` | `clamp(2.75rem, 9vw, 7.5rem)` | display 400 | `-0.02em` | `0.95` |
| `--t-h1` | `clamp(2.25rem, 6vw, 4.5rem)` | display 400 | `-0.015em` | `1.03` |
| `--t-h2` | `clamp(1.75rem, 4vw, 3rem)` | display 400 | `-0.01em` | `1.1` |
| `--t-h3` | `clamp(1.375rem, 2.5vw, 1.875rem)` | display 500 | `0` | `1.2` |
| `--t-eyebrow` | `0.8125rem` | display 500 italic | `0.14em` uppercase | `1` |
| `--t-body-lg` | `1.1875rem` | ui 400 | `0` | `1.65` |
| `--t-body` | `1.0625rem` | ui 400 | `0` | `1.6` |
| `--t-menu` | `1.0625rem` min | ui 500 | `0` | `1.5` |
| `--t-small` | `0.9375rem` | ui 400 | `0` | `1.5` |
| `--t-price` | `1.0625rem` | ui 600, `font-variant-numeric: tabular-nums` | `0` | `1` |

**Menu body copy never drops below 17px (`1.0625rem`).** The buyer is standing at a counter, in Spanish, often holding a child. This is a functional requirement, not a preference.

Every number in the portal — prices, quantities, currency, percentages — uses `font-variant-numeric: tabular-nums`. Columns must align.

### 3.2 Bilingual typesetting

Spanish runs roughly 15–20% longer than English. Every headline, button and card must be laid out so the **Spanish string is the constraint**. If a CTA fits "Order a Cake" but breaks on "Pedir un Pastel," the CTA is wrong. Test every screen in `/es` first.

---

## 4. Space, radius, shadow

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px;  --space-6: 32px;  --space-7: 48px;  --space-8: 64px;
--space-9: 96px;  --space-10: 128px; --space-11: 160px;

--radius-sm:   8px;    /* chips, badges, inputs */
--radius:      14px;   /* buttons, small cards */
--radius-lg:   28px;   /* product cards, panels */
--radius-xl:   48px;   /* chamber corners on mobile */
--radius-2xl:  80px;   /* chamber corners on desktop */
--radius-pill: 999px;

--shadow-sm: 0 1px 2px rgb(25 25 24 / .05);
--shadow:    0 8px 24px -12px rgb(25 25 24 / .16);
--shadow-lg: 0 24px 60px -28px rgb(25 25 24 / .28);

--border-chamber: 2px;   /* the ink border between chambers */
--border-hairline: 1px;
```

Section rhythm: `--space-9` between sections on mobile, `--space-11` on desktop. Content max width `1200px`; prose max width `68ch`; menu columns max `640px` each.

---

## 5. The chamber system

The page is a stack of **chambers**. Each chamber is a full-bleed band with `--radius-xl`/`--radius-2xl` corners and a `2px solid var(--ink)` border, alternating between paper and dark.

| Chamber | Theme | Contents |
|---|---|---|
| 1 · Hero | dark | Signature motion, positioning line, primary CTA, hours + neighborhood |
| 2 · Proof | paper | 4.3★ / 663 Google reviews, *Richmond Magazine*, years in business, family photo |
| 3 · The Case | dark | Hero products — tres leches and pan dulce — as large photo cards |
| 4 · Story | paper | Argentina Ortega, three short paragraphs, one photo |
| 5 · Menu entry | paper | Tabbed category preview → "Ver el menú completo" |
| 6 · Cakes | dark | Quinceañera / wedding / birthday, the highest-ticket band |
| 7 · Wholesale | wheat | *"¿Tienes una tienda?"* — the 250-account line, finally visible |
| 8 · Reviews | paper | Real quotes, with source and date |
| 9 · Visit | paper | Map, directions, parking, hours |
| 10 · Order band | dark | Closing CTA. Sticky equivalent on mobile. |

Never place two dark chambers adjacent. Never exceed **two** visible motion effects per viewport.

---

## 6. Components

### Buttons

| Variant | Light | Dark |
|---|---|---|
| **Primary** | bg `--accent`, text `--accent-ink`, radius pill, `--space-3 --space-6` | bg `--accent`, text `--accent-ink` |
| **Primary (on photo)** | bg `--accent-strong`, text `#FFFFFF` | same |
| **Secondary** | transparent, `2px solid var(--ink)`, text `--ink` | `2px solid var(--ink)` where `--ink` is the light token |
| **Ghost** | text `--accent-strong`, 2px underline offset 4px | text `--accent` |

Minimum tap target **48×48px** everywhere. Hover raises `translateY(-2px)` over 160ms; `:active` returns to 0. Focus ring: `3px solid var(--accent-strong)` at `2px` offset — visible on both themes, never removed.

### Product card
`--radius-lg`, `--surface`, `1px solid var(--line)`. 4:3 image with `object-fit: cover`. Name in display 500. Description in `--t-small`, `--ink-muted`, clamped to 2 lines. Price bottom-right in `--t-price` with tabular numerals — no leader dots, no `$` alignment column. An 86'd item renders at 55% opacity with a `--danger` chip reading *"Se acabó por hoy" / "Sold out today."*

### Menu row (list density)
Full-width row, `--space-4` vertical padding, hairline `--line` between rows. Spanish name in display 500; English gloss beneath in `--t-small` `--ink-muted`. Price right-aligned, tabular. **Never leader dots.** Prices are not visually aligned into a scannable column — guests should read the food first.

### Sticky mobile bar
Fixed bottom, `--surface`, `2px solid var(--ink)` top border, `env(safe-area-inset-bottom)` respected. Four equal targets: **Pedir · Menú · Llamar · Cómo llegar**. Height 64px + safe area. Present on every public page.

### Stepper (cake configurator, checkout)
Horizontal on desktop, compact numeric on mobile. Completed steps get an `--accent` filled dot; the active step gets an `--accent` ring; future steps get `--line-strong`. Progress is announced to screen readers via `aria-current="step"` and a visually-hidden live region.

### Portal (Seline Analytics treatment)
Canvas `--bg`. Cards flat `--surface` with a single `0 4px 16px -8px` shadow and `1px solid var(--line)` — hairlines are the primary structural device, not heavy panels or dividers. Pill controls. One accent (`--accent-strong` on light) as the only chromatic element besides status colors. Data tables: 44px rows, tabular numerals, sticky header, zebra via `--bg-alt` at 50%.

---

## 7. Motion

**One signature move, derived from the brand, repeated.**

The circular baker mark **draws itself**: the ring strokes on, the toque fills, the face lines draw. It is the page-load state, the route-transition mask, and the divider glyph between chambers. Implement as an inline SVG with `stroke-dasharray`/`stroke-dashoffset` driven by GSAP. Total duration 900ms, `power2.out`. It runs **once per session**, stored in `sessionStorage` — nobody wants to watch a logo draw itself eleven times.

| Move | Trigger | Spec |
|---|---|---|
| Chamber reveal | ScrollTrigger, `start: 'top 80%'` | `opacity 0→1`, `y 24px→0`, 600ms `power2.out`, stagger 60ms |
| Card "plating" | ScrollTrigger per card | `y 12px→0` + `scale .985→1`, 480ms — the card settles like a plate set on a counter |
| Hero steam | autoplay loop | Two masked SVG paths drifting `y -40px` + `opacity .35→0`, 6s and 7.4s, `repeat: -1` |
| Split headline | on enter | GSAP SplitText by word, `y 100%→0`, stagger 40ms, `power3.out` |
| Menu tab change | on click | Framer Motion `layoutId` underline, 240ms spring |
| Stepper advance | on step | 200ms slide + fade, direction-aware |
| Count-up | proof chamber | 663 reviews / 4.3 stars counts up once, 1.2s |

**Hard rules**

- Lenis for smooth scroll; GSAP ScrollTrigger for choreography; Framer Motion for component state and the stepper.
- **No React Three Fiber in this build.** A bakery menu does not earn a 3D engine.
- Animate `transform` and `opacity` only. Never `width`, `height`, `top`, `left`, or `box-shadow`.
- **No motion library work on the main thread during LCP.** Hero text is server-rendered and visible before any GSAP runs; the animation enhances it, it does not create it.
- Maximum **two** visible effects per viewport.
- Every animation has a `prefers-reduced-motion: reduce` off-ramp that renders the final state immediately. The steam loop stops entirely. The logo draw resolves instantly.
- 60fps or cut it. If a move drops Lighthouse below 95, it is deleted, not optimized.

---

## 8. Imagery

- **Real photographs of the real product, always.** AI-generated imagery is permitted for atmosphere plates, textures, and motion backgrounds only — **never for a dish a customer will order**, and never in a way that misrepresents portion, plating, or ingredients.
- All product photography is warm-graded: amber, deep char, caramel. Never cool blue-white — it kills appetite.
- Every image ships AVIF with WebP fallback, explicit `width`/`height`, and `sizes`. Hero image is `priority`; everything else lazy.
- **Every food photo has descriptive bilingual alt text.** Not "cake" — *"Pastel de tres leches de dos pisos con listones color vino"* / *"Two-tier tres leches cake with wine-colored ribbon."*
- Hero video, if used: ≤ 2.5 MB, poster-first, `preload="none"`, `muted playsinline loop`, and skipped entirely under reduced-motion.

---

## 9. Accessibility floor

WCAG 2.2 AA is the floor, not the goal.

- One `<h1>` per page. Heading levels never skip.
- Real landmarks: `header`, `nav`, `main`, `footer`, `aside`.
- Skip-to-content link, first focusable element on every page.
- Focus visible on every interactive element, always. Never `outline: none` without a replacement.
- Full keyboard pass through the cake configurator and checkout, with no traps.
- Every form field has a `<label>`. Errors are announced via `aria-live="polite"` and linked with `aria-describedby`.
- `lang` attribute switches with locale. Mixed-language strings (a Spanish dish name inside English copy) get an inline `lang="es"`.
- Target size 24×24 CSS px minimum (WCAG 2.2 AA); we ship 48×48.

---

## 10. Performance budget

| Metric | Budget |
|---|---|
| Lighthouse mobile — every public page | ≥ 95 across all four categories |
| LCP | < 2.0s |
| CLS | < 0.05 |
| INP | < 200ms |
| Initial JS (marketing routes) | < 120 KB gzipped |
| Hero image | < 180 KB AVIF |
| Hero video (if used) | ≤ 2.5 MB |
| Fonts | 2 families, 7 weights total, self-hosted via `next/font`, preloaded |

Marketing routes are statically rendered or ISR. GSAP and Lenis are dynamically imported and never included in the initial bundle for a route that does not animate. The portal is client-rendered behind auth and is exempt from the marketing JS budget — but not from the accessibility floor.

---

## 11. What NOT to do

- Do not ship default shadcn/Tailwind colors. Every component is re-tokenized to this file before it is used.
- Do not use React Bits' Splash Cursor, Blob Cursor, Pixel Trail, Ballpit, Balatro, or Antigravity. They cheapen the room.
- Do not put the menu in a PDF or an image. Ever. It is an SEO and accessibility failure.
- Do not use leader dots or an aligned price column on the menu.
- Do not center long body copy.
- Do not write "Welcome to our website," "Bienvenidos a nuestro sitio web," or any variant.
- Do not use stock photography of generic pastries.
- Do not ship a language toggle that is a Google Translate widget.
- Do not invent a price, an allergen claim, an award, a review, or a founding year. Anything unconfirmed renders from a `CONFIRM_WITH_CLIENT` constant that is visibly flagged in dev and blocks the production build.
