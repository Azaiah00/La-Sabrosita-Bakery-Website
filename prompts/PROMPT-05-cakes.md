# PROMPT 05 — Cake pages and gallery

> Requires PROMPT 01–04. Read `DESIGN.md` before starting.

---

## Goal

Build the four cake pages — hub, quinceañera, weddings, birthdays — as the highest-ticket surface on the site, with a real gallery, honest pricing guidance, stated lead times, and `Product`/`FAQPage` schema. These pages exist to convert a phone call into a documented, deposited order.

Today the client's highest-priced product has no page, no gallery, no pricing guide, no lead-time policy and no inquiry form. Google's own review-theme extraction shows *birthday cake* (16 mentions) and *cake decoration* (8) among the top topics — the demand is already there and it is being handled entirely by phone.

## Files to create

```
src/app/[locale]/pasteles/page.tsx
src/app/[locale]/pasteles/quinceanera/page.tsx
src/app/[locale]/pasteles/bodas/page.tsx
src/app/[locale]/pasteles/cumpleanos/page.tsx
src/components/marketing/cake-gallery.tsx
src/components/marketing/cake-size-table.tsx
src/components/marketing/lead-time-notice.tsx
src/components/marketing/faq-accordion.tsx
src/lib/cakes.ts
src/lib/schema/cake-jsonld.ts
```

## Visual treatment — the one deliberate tonal shift

The three sub-pages (quinceañera, bodas, cumpleaños) use a **darkroom product editorial** treatment, adapted from Refero's *ORYZO AI* style: `data-theme="dark"` on the whole page, one cake per viewport band, lit as if from a single soft source above-left, deep shadow falloff, generous negative space. This is the only place on the site that goes fully dark — it makes the highest-ticket product feel like the highest-ticket product.

The hub page (`/pasteles`) stays in the standard chamber rhythm so the transition reads as intentional.

## `/pasteles` — the hub

- H1 **ES:** *Pasteles hechos a mano* · **EN:** *Cakes made by hand*
- Lede **ES:** *Tres leches, vainilla, chocolate o mármol. Decorados a mano por nuestras decoradoras, para el día que importa.*
- Three large cards → quinceañera / bodas / cumpleaños, each with a real photograph and its minimum lead time.
- Below: the size and serving table (see below), then the flavor/filling/frosting list, then FAQ, then the primary CTA to the configurator.

## `cake-size-table.tsx`

Rendered from `cake_sizes`, never hard-coded:

| Tamaño / Size | Porciones / Serves | Desde / From | Anticipación / Notice |
|---|---|---|---|
| ¼ de plancha | 15–20 | $45 | 48 horas |
| ½ plancha | 30–40 | $75 | 48 horas |
| Plancha entera | 60–80 | $135 | 3 días |
| 2 pisos | 50–70 | $195 | 7 días |
| 3 pisos | 90–120 | $325 | 7 días |

Every price is prefixed *"Desde"* / *"From"* and every price on this page renders through `CONFIRM_WITH_CLIENT`. A note under the table, in `--t-small`:

**ES:** *El precio final depende del tamaño, los pisos, el relleno y la decoración. Confirmamos el total antes de cobrar el depósito.*
**EN:** *Final price depends on size, tiers, filling and decoration. We confirm the total before taking a deposit.*

Numbers are `tabular-nums`.

## `lead-time-notice.tsx`

Reads `lead_time_rules` and renders the binding rule for the page's context, in plain language. Fondant and edible-photo finishes add hours — those are real rows, not decoration:

**ES:** *Pasteles de dos o tres pisos: 7 días de anticipación. Fondant: 3 días adicionales. Foto comestible: 1 día adicional.*

If the client later changes a rule in the admin portal, this text changes. It is never a hard-coded string.

## `/pasteles/quinceanera`

The single highest-value page on the site.

- H1 **ES:** *Pasteles de quinceañera* · **EN:** *Quinceañera cakes*
- Lede **ES:** *Dos y tres pisos, en los colores de tu vestido. Hacemos pasteles de quince años en Richmond desde hace años — y todavía se decoran a mano, uno por uno.*
- Gallery of real quinceañera cakes the bakery has made. **Real photographs only.** If the client has none yet, ship the page with the shot list from `docs/ASSET-BRIEF.md` and a single hero image, and do not fill the gap with AI-generated or stock cake photography.
- Serving guide: how many guests → which size.
- Color and theme note: *"Traemos tu color. Trae una foto o un listón de tu vestido."*
- Lead time notice: 7 days.
- Deposit policy, stated plainly before any commitment (from `settings.deposit_policy`): *30% de depósito. Cancelación con 72 horas: reembolso completo. Con 48 horas: 50%.*
- FAQ accordion, 6 questions.
- Primary CTA: **Diseñar tu pastel** → the configurator with `occasion=quinceanera` preset.

## `/pasteles/bodas`

- H1 **ES:** *Pasteles de boda* · **EN:** *Wedding cakes*
- The bakery's own Welcome page already claims *"Our expert decorators create exceptional wedding cakes"* — this page finally shows them.
- Tasting policy, tier guidance, delivery vs. pickup, setup expectations.
- Lead time: 7 days minimum; recommend 4–6 weeks for a wedding date.
- CTA: **Solicitar una cotización** — routes to the configurator with `occasion=boda`, which for weddings collects the details and opens a quote conversation rather than charging immediately.

## `/pasteles/cumpleanos`

- H1 **ES:** *Pasteles de cumpleaños* · **EN:** *Birthday cakes*
- The everyday workhorse. Fastest path to the configurator — the size table and CTA sit above the fold on mobile.
- Edible photo cakes get their own short block: what to send, resolution guidance, and the extra 24-hour lead time.
- Lead time: 48 hours standard.

## FAQ content — write these out in full, both locales

Use exactly these six on the quinceañera and birthday pages (adjust the specifics per page):

1. **¿Con cuánta anticipación debo pedir?** / *How far ahead should I order?*
2. **¿Cuánto cuesta un pastel para 60 personas?** / *What does a cake for 60 people cost?*
3. **¿Puedo llevar una foto de lo que quiero?** / *Can I bring a photo of what I want?*
4. **¿Cuánto es el depósito y puedo cancelar?** / *How much is the deposit, and can I cancel?*
5. **¿Hacen pasteles sin gluten o sin lácteos?** / *Do you make gluten-free or dairy-free cakes?* — **This answer must come from the client in writing.** Until it does, render: *"Llámanos al (804) 986-9695 para preguntar por opciones especiales."* Do not answer it yourself.
6. **¿Entregan o solo recogida?** / *Do you deliver, or is it pickup only?* — Also client-confirmed.

Each renders in a shadcn `Accordion` and is emitted as `FAQPage` JSON-LD.

## Structured data

Per page:
- `Product` with `offers` as an `AggregateOffer` carrying `lowPrice`, `highPrice`, `priceCurrency: "USD"`, and `availability: "https://schema.org/InStock"`.
- `FAQPage` with every question and its answer, matching the visible text exactly.
- `BreadcrumbList`: Inicio → Pasteles → Quinceañera.
- Do **not** emit `AggregateRating` on a cake product. The 4.3/663 rating is for the business, not for a specific cake, and attaching it to a product node is a structured-data violation.

## Acceptance criteria

- [ ] All four pages render in both locales with no layout break; `/es` checked first.
- [ ] Lighthouse mobile ≥ 95 on all four.
- [ ] The size table and every lead-time string are database-driven — change a row, the page changes.
- [ ] Every price displays with a "Desde"/"From" prefix and passes through `CONFIRM_WITH_CLIENT`.
- [ ] `Product` and `FAQPage` JSON-LD validate clean in Google's Rich Results Test.
- [ ] The FAQ answers in JSON-LD match the visible text character-for-character.
- [ ] The gallery is keyboard-navigable, has a visible focus ring, and every image has descriptive bilingual alt text.
- [ ] Deposit and cancellation policy is visible on every cake page before any CTA.
- [ ] The dark treatment does not break contrast: run the axe DevTools scan and get zero color-contrast violations.
- [ ] Reduced-motion pass on the gallery.

## What NOT to do

- Do not use stock or AI-generated photography for a cake a customer can order. Real cakes only.
- Do not state a firm price. Every figure is "from," and every figure is confirmable.
- Do not answer the dietary or delivery FAQ yourself. Those are client facts.
- Do not attach the business's `AggregateRating` to a `Product` node.
- Do not invent an award, a magazine feature, or a wedding venue partnership.
- Do not put the configurator behind a "call us" button. The whole point is that it takes the order.
