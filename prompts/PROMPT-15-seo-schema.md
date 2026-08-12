# PROMPT 15 — SEO, structured data, metadata, analytics

> Requires PROMPT 01–14.

---

## Goal

Own the search terms nobody in this market is contesting. The current site has **zero JSON-LD, zero Open Graph tags, no meta description, no canonical, and zero `<h1>`/`<h2>`/`<h3>` elements on any page** — every line of text is an absolutely-positioned `<div>`. All four page titles are `A Warm Welcome!`, `PRODUCTS`, `ABOUT US`, `Contact Us`. All three images have empty `alt`.

The competitive picture: Panadería El Globo (4.6★, 290 reviews, 35+ years), Panadería El Sol (4.1★, 145), and Las Delicias (4.7★, 91) have **no websites at all** — Facebook pages only. Smallcakes runs a Weebly with no prices. La Sabrosita has the most reviews in the category (663) and the worst digital presence. That asymmetry is the entire opportunity.

## Files to create

```
src/lib/schema/
  bakery.ts
  breadcrumb.ts
  faq.ts
  menu.ts
  product.ts
  organization.ts
  index.ts
src/lib/metadata.ts
src/app/sitemap.ts
src/app/robots.ts
src/app/[locale]/opengraph-image.tsx
src/app/[locale]/menu/opengraph-image.tsx
src/components/analytics/ga.tsx
src/lib/analytics/events.ts
public/site.webmanifest
```

---

## 1. Target queries

Spanish and English, both routed to the right page. These are the terms to instrument and track:

| Query | Target page |
|---|---|
| panadería cerca de mí · panadería mexicana Richmond VA | `/es` |
| pan dulce Richmond · concha Richmond VA | `/es/menu/pan-dulce` |
| quesadilla salvadoreña Richmond | `/es/menu/quesadilla` |
| tres leches Richmond · tres leches cake near me | `/es/menu/pasteles`, `/en/menu/pasteles` |
| pastel de quinceañera Richmond · quinceañera cake Richmond VA | `/es/pasteles/quinceanera` |
| pastel de cumpleaños Richmond · birthday cake Richmond VA | `/es/pasteles/cumpleanos` |
| wedding cake Richmond VA | `/en/cakes/weddings` |
| Latin bakery Richmond · Mexican bakery near me | `/en` |
| pan dulce al por mayor Virginia · wholesale pan dulce Virginia | `/es/mayoreo` |
| bakery North Chesterfield VA · Midlothian Turnpike bakery | `/en/visit` |

---

## 2. Metadata — `src/lib/metadata.ts`

A `buildMetadata()` helper every page uses. Per page, per locale:

- **Title:** `{{Page}} | La Sabrosita Bakery — Panadería en Richmond, VA`, kept under 60 characters. Home ES: `Panadería en Richmond, VA | La Sabrosita Bakery`. **Never `A Warm Welcome!`.**
- **Description:** 150–160 characters, written per page, containing the cuisine, the neighborhood, and a reason to click. Never duplicated across pages, never auto-generated from body text.
- **Canonical:** self-referencing, absolute.
- **`hreflang`:** `es-US`, `en-US`, and `x-default` pointing at the Spanish version. Every page, both directions, verified.
- **Open Graph:** `og:title`, `og:description`, `og:image` (1200×630), `og:type`, `og:locale` (`es_US` / `en_US`), `og:locale:alternate`, `og:site_name`, `og:url`.
- **Twitter:** `summary_large_image`.
- **Robots:** `index, follow` on public pages; `noindex, nofollow` on `/portal/*`, `/admin/*`, `/mayoreo/*` (authenticated) and `/pedido/*`.

`opengraph-image.tsx` generates the share card at the edge: warm cream background, the circular baker mark, the page title in EB Garamond, and the address line. Right now, sharing any URL from their site to Facebook or iMessage produces a bare grey link.

---

## 3. Structured data

### `bakery.ts` — the root node, on every public page

```json
{
  "@context": "https://schema.org",
  "@type": "Bakery",
  "@id": "https://www.lasabrositabakery.com/#bakery",
  "name": "La Sabrosita Bakery",
  "url": "https://www.lasabrositabakery.com",
  "telephone": "+1-804-986-9695",
  "email": "LaSabrositaBakery@gmail.com",
  "priceRange": "$",
  "servesCuisine": ["Salvadoran","Mexican","Central American","South American","Puerto Rican","Latin American"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7730 Midlothian Turnpike, Ste A",
    "addressLocality": "Richmond",
    "addressRegion": "VA",
    "postalCode": "23235",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 37.4989876, "longitude": -77.5400652 },
  "hasMap": "https://www.google.com/maps/place/?q=place_id:…",
  "openingHoursSpecification": [ /* from opening_hours */ ],
  "specialOpeningHoursSpecification": [ /* from special_hours */ ],
  "hasMenu": "https://www.lasabrositabakery.com/es/menu",
  "acceptsReservations": false,
  "paymentAccepted": "Cash, Credit Card, Debit Card",
  "currenciesAccepted": "USD",
  "sameAs": [
    "https://www.facebook.com/p/La-Sabrosita-Bakery-100063568330828/",
    "https://www.instagram.com/lasabrositabakery/"
  ]
}
```

**Rules:**
- `openingHoursSpecification` is generated from the database, never hard-coded. The hours are currently contradictory across four sources — the database is the single point of truth and must be corrected before this ships.
- `aggregateRating` is emitted **only** on the home page, **only** with the real figures (4.3 / 663 as of 12 Aug 2026), and **only after the client confirms** they want it displayed. Google requires that a rating in markup be visible on the page — so if it is in the schema, the proof strip must show it too. If either condition fails, omit the node entirely rather than fudging it.
- `priceRange` is `"$"`, matching Google's own `$1–20` band for this business.
- `servesCuisine` includes Salvadoran because the founder is Salvadoran and the hero product is the Quesadilla Salvadoreña. That is a real differentiator and no competitor claims it.

### The rest

- `menu.ts` — `Menu` / `MenuSection` / `MenuItem` from PROMPT 04. `suitableForDiet` only where client-confirmed. **No `nutrition` block.**
- `product.ts` — `Product` + `AggregateOffer` on cake pages. **Never** attach the business `AggregateRating` to a product.
- `faq.ts` — `FAQPage`, matching visible text character-for-character.
- `breadcrumb.ts` — `BreadcrumbList` on every page below the root.
- `organization.ts` — `Organization` with `founder: { "@type": "Person", "name": "Argentina Ortega" }`, `foundingDate` (**pending confirmation — omit rather than guess**), and `sameAs`.

All nodes emitted as a single `@graph` in one `<script type="application/ld+json">` per page, with `@id` cross-references. Every block validated in Google's Rich Results Test **and** the Schema.org validator before this prompt is done.

---

## 4. `sitemap.ts` and `robots.ts`

Sitemap: every public route in both locales with `<xhtml:link rel="alternate" hreflang>` entries, generated from the route map plus the database (menu categories, cake pages). `lastModified` from the relevant `updated_at`. `changeFrequency` honest — `weekly` for the menu, `monthly` for the story.

Robots: allow everything except `/portal/`, `/admin/`, `/mayoreo/` (authenticated paths), `/pedido/`, and `/api/`. Reference the sitemap.

---

## 5. Technical SEO checklist

- One `<h1>` per page; heading levels never skip. (Currently: zero headings on the entire live site.)
- Every image: descriptive bilingual `alt`, explicit `width`/`height`, AVIF with WebP fallback, `sizes` set. (Currently: three images, all with empty `alt`.)
- Internal links from **every page** to `/menu` and to the primary order CTA.
- Breadcrumbs rendered visibly, not only in JSON-LD.
- Clean semantic HTML: `header`, `nav`, `main`, `article`, `section`, `footer`.
- Core Web Vitals green on every public route.
- `www` vs apex resolved with a 301 to one canonical host.
- The old iWeb URLs 301-redirect to their new homes: `/Welcome.html` → `/es`, `/Products/Products.html` → `/es/menu`, `/About_Us.html` → `/es/nuestra-historia`, `/Contact_Us.html` → `/es/visitanos`. **These four are indexed today — losing them would throw away the site's only existing equity.**

---

## 6. Analytics

GA4 via `next/third-parties`, loaded with `strategy="afterInteractive"` so it never touches LCP. A cookie-consent gate that **defaults to denied** and only fires GA on explicit acceptance — choose the privacy-preserving default.

Conversion events in `src/lib/analytics/events.ts`:

| Event | Fires |
|---|---|
| `view_menu`, `search_menu` | Menu interaction |
| `begin_cake_config`, `cake_step_completed`, `cake_order_submitted` | Configurator funnel, step-level |
| `add_to_cart`, `begin_checkout`, `purchase` | Ordering funnel, with value |
| `click_call`, `click_directions` | Sticky-bar intent |
| `wholesale_application_started`, `wholesale_application_submitted` | Wholesale funnel |
| `language_switched` | ES/EN behaviour |

Never put personal data in an event parameter. `purchase` carries `transaction_id`, `value`, `currency`, and `items` — never a name, phone or email.

Also: Google Search Console verification, Bing Webmaster Tools, and both sitemaps submitted at launch.

---

## Acceptance criteria

- [ ] Every public page validates clean in Google's Rich Results Test — zero errors, zero warnings.
- [ ] Every JSON-LD block validates in the Schema.org validator.
- [ ] `hreflang` verified in both directions on every page, with `x-default` on Spanish.
- [ ] `curl -s <url> | grep -c '<h1'` returns exactly 1 for every public page.
- [ ] No image on a public page has an empty `alt`.
- [ ] All four legacy iWeb URLs 301 to the correct new pages. Test each with `curl -I`.
- [ ] Sharing a URL to Facebook and to iMessage produces a proper card with the generated OG image. Actually paste a link into both and look.
- [ ] Sitemap parses, contains every public route in both locales, and includes hreflang alternates.
- [ ] `/portal`, `/admin`, `/mayoreo` and `/pedido` are `noindex` and blocked in robots.
- [ ] Hours in the JSON-LD match the database and the visible hours table exactly.
- [ ] `aggregateRating` either matches the real, visible figures or is absent. Nothing in between.
- [ ] GA4 fires only after consent; the consent default is denied.
- [ ] No personal data appears in any analytics event — inspect the network payloads.
- [ ] Lighthouse SEO 100 on every public page.
- [ ] Core Web Vitals green in a real PageSpeed Insights run against the deployed URL, not just local.

## What NOT to do

- Do not emit a rating, review, award, or founding date that is not real, current, and visible on the page.
- Do not attach `AggregateRating` to a `Product`.
- Do not emit `nutrition` or an unconfirmed `suitableForDiet`.
- Do not auto-generate meta descriptions from body text.
- Do not let the four legacy URLs 404.
- Do not load analytics before consent, and do not default consent to granted.
- Do not stuff keywords into alt text. Describe the photograph.
- Do not machine-translate the Spanish metadata. It is the primary language and it is what the local search terms are actually in.
