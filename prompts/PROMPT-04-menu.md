# PROMPT 04 — The menu system

> Requires PROMPT 01–03. Read `DESIGN.md` before starting.

---

## Goal

Build the full bilingual menu: an index page across all six categories, a page per category, search, dietary filtering, live 86 state, and complete `Menu`/`MenuSection`/`MenuItem` structured data. **The menu is crawlable HTML text. It is never a PDF and never an image.**

This is the highest-value SEO surface in the entire build. No competitor in the Richmond Latin-bakery market has a searchable menu — not Panadería El Globo, not El Sol, not Las Delicias. Whoever ships one owns *pan dulce near me*, *panadería cerca de mí*, *tres leches Richmond* and *concha Richmond VA*.

## Files to create

```
src/app/[locale]/menu/page.tsx
src/app/[locale]/menu/[category]/page.tsx
src/components/marketing/menu-search.tsx
src/components/marketing/menu-category-nav.tsx
src/components/marketing/menu-section.tsx
src/components/marketing/menu-row.tsx
src/components/marketing/dietary-filter.tsx
src/lib/menu.ts
src/lib/schema/menu-jsonld.ts
```

## Data

Server-side, one query, cached with `revalidate: 300`:

```ts
// src/lib/menu.ts
export async function getMenu(locale: 'es' | 'en') {
  // menu_categories (is_active, sort_order)
  //   -> products (is_active, sort_order)
  //        -> product_variants (is_active, sort_order)
  //        -> product_images (sort_order)
  // Returns categories with nested products and variants,
  // with name/description resolved to the active locale
  // but BOTH names retained (Spanish is the name; English is the gloss).
}
```

Seasonal products (`season_start` / `season_end`) are filtered server-side against today's date in `America/New_York`. Time-windowed products (`available_from` / `available_to`) still render, with a note — *"Desde las 7:00 a.m."* / *"From 7:00 AM"* — because a customer browsing at 6 AM still wants to know conchas are coming.

## `/menu` — the index

- H1 **ES:** *Nuestro menú* · **EN:** *Our menu*
- Sub: *Todo se hace a mano cada mañana. Los precios pueden cambiar.* / *Everything is made by hand each morning. Prices subject to change.*
- Sticky category nav below the header: six pills, `--radius-pill`, active pill filled `--accent` with `--accent-ink`. Scroll-spy sets the active pill; clicking scrolls to the section with `scroll-margin-top` clearing both the header and the pill bar.
- Search input, sticky with the nav. Client-side, diacritic-insensitive, matches **both** language names and both descriptions. Typing `quesadilla`, `Quesadilla Salvadoreña`, `cheese bread`, or `quesadila` must all find the same product.
- Dietary filter chips render **only** for tags present in the data. `dietary_tags` is client-confirmed data; if it is empty, the filter does not render at all. **Never infer a dietary tag from an ingredient list.**
- All six categories render on this page as sections. Category pages exist for SEO and for deep links.

## `/menu/[category]` — per category

Static params generated from `menu_categories.slug`. Same rows, one category, plus a short category intro and cross-links to the other five. Canonical to itself; the index links to each with a normal `<a>`.

## `menu-row.tsx`

```
┌────────────────────────────────────────────────────────┐
│ [photo 64×64        ]  Quesadilla Salvadoreña      13.99│
│ [rounded --radius-sm]  Salvadoran Cheese Bread          │
│                        Pan de queso salvadoreño…        │
│                        [entera ▾]  ● Sin gluten         │
└────────────────────────────────────────────────────────┘
```

- Spanish name: display 500, `--t-menu`, **minimum 17px**.
- English gloss: `--t-small`, `--ink-muted`, directly beneath. In `/en` the order flips — English name first, Spanish beneath — because the Spanish name is the real name and is worth learning either way.
- Description: `--t-small`, clamped to two lines, expandable on tap.
- Price: right-aligned, `--t-price`, `font-variant-numeric: tabular-nums`. **No leader dots. No aligned price column.** Prices sit at the natural right edge of each row so the eye reads food first.
- Multi-variant products (Quesadilla: pequeña / ¼ / ½ / entera) render a compact inline `Select`; the price updates on change with no layout shift.
- Photo is optional. Rows without one collapse gracefully — no placeholder grey box.
- 86'd: 55% opacity, `--danger` chip *"Se acabó por hoy" / "Sold out today"*, and the row is not tabbable to a purchase action.
- Every row links to the ordering flow with the variant preselected.

## Menu engineering

Within each section, the top two positions are reserved for the highest-margin items, taken from `v_variant_margin` ordered by `contribution_margin` descending, then the rest fall back to `sort_order`. Give exactly one item per section a `--accent-soft` background and a *"El favorito"* / *"House favorite"* badge — the highest-margin item that also has a real photo. One per section. Never two.

## Structured data — `menu-jsonld.ts`

Emit on `/menu` (all categories) and on each category page (that category only):

```json
{
  "@context": "https://schema.org",
  "@type": "Menu",
  "name": "Menú — La Sabrosita Bakery",
  "inLanguage": "es-US",
  "hasMenuSection": [{
    "@type": "MenuSection",
    "name": "Pan Dulce",
    "hasMenuItem": [{
      "@type": "MenuItem",
      "name": "Concha",
      "description": "Pan de levadura suave con costra de azúcar rayada a mano.",
      "image": "https://…",
      "offers": { "@type": "Offer", "price": "1.75", "priceCurrency": "USD" }
    }]
  }]
}
```

Rules:
- `suitableForDiet` is emitted **only** where the client has confirmed a dietary tag. Never inferred.
- No `nutrition` block at all until the client provides lab or recipe-derived values in writing.
- The `Menu` is linked from the `Bakery` node's `hasMenu` in PROMPT 15.
- Validate every block against the Schema.org validator and Google's Rich Results Test before this prompt is considered done.

## Cross-contamination disclaimer

At the foot of every menu page, in `--t-small` `--ink-muted`, in both locales:

**ES:** *Nuestros productos se elaboran en una cocina donde se manejan trigo, huevo, leche, nueces y soya. No podemos garantizar que ningún producto esté libre de alérgenos.*
**EN:** *Our products are made in a kitchen that handles wheat, egg, milk, tree nuts and soy. We cannot guarantee any product is free of allergens.*

This ships on every menu page from day one, regardless of what dietary tags exist.

## Price disclaimer

Directly under the H1, in `--t-small`:
**ES:** *Los precios pueden cambiar. Llámanos al (804) 986-9695 para confirmar.*
**EN:** *Prices subject to change. Call us at (804) 986-9695 to confirm.*

This matters here specifically: the client's old site published prices roughly 50% below current, and customers arrived expecting to pay half.

## Acceptance criteria

- [ ] Every product and variant in the database renders as real HTML text. `curl -s localhost:3000/es/menu | grep -c "Quesadilla"` returns > 0.
- [ ] Lighthouse mobile ≥ 95 on `/es/menu` and every category page.
- [ ] Search finds items by Spanish name, English name, description, and with missing accents.
- [ ] The variant selector changes the displayed price with zero CLS.
- [ ] Setting `is_86ed = true` in the database is visible on the public menu within 5 minutes (ISR revalidate) or immediately via on-demand revalidation.
- [ ] JSON-LD validates clean in Google's Rich Results Test with zero errors and zero warnings.
- [ ] `hreflang` alternates are present and correct between `/es/menu` and `/en/menu`.
- [ ] Screen-reader pass: category nav is a real `nav` with a list; each section is a landmark with a heading; prices are announced with their item, not orphaned.
- [ ] Menu body text measures ≥ 17px in DevTools.
- [ ] No horizontal overflow at 320px.
- [ ] The disclaimer renders on every menu page in both locales.

## What NOT to do

- Do not render the menu as a PDF, an image, or a canvas.
- Do not use leader dots or a right-aligned price column.
- Do not infer, guess, or auto-generate a dietary or allergen tag. Ever.
- Do not emit `nutrition` in the JSON-LD.
- Do not hide items behind an accordion by default — every item must be in the initial HTML for crawlers.
- Do not lazy-load the menu list client-side. It is server-rendered.
- Do not translate a product name into English as the primary label. *Concha* is a concha.
