# LA SABROSITA BAKERY — Intelligence, Audit & Build Plan
**Part 1 of the build package.** Research and direction. Part 2 is the copy-paste prompt set.

Prepared: 12 August 2026
Client: La Sabrosita Bakery — 7730 Midlothian Turnpike # A, Richmond, VA 23235
Prepared for: Frederick / Real Estate Advancement
Build target: Cursor AI agents + Claude Code · repo `C:\Users\azaia\OneDrive\La-Sabrosita-Bakery-Website`

---

## 0. THE HEADLINE

Four things, in the order they will make money:

1. **The Google Business Profile is unclaimed.** 663 reviews, 4.3 stars, and the panel still reads *"Claim this business."* Someone else's crowd-sourced hours are the hours Google shows. This is free, it takes 20 minutes, and it moves the local pack before a single line of code ships.
2. **The wholesale business is invisible.** Their own About page says they distribute to **~250 Hispanic stores across Virginia, the Eastern Shore, and Elizabeth City, NC.** There is no wholesale page, no line sheet, no account portal, no reorder form, no minimum, no delivery zone map. That is very likely the largest revenue line in the business and it has zero digital surface anywhere.
3. **The website has zero conversion mechanisms.** I inspected the live DOM: `forms=0`, `buttons=0`, `h1=0`, `h2=0`, `h3=0`, `jsonLd=0`, `ogTags=0`, `metaDescription=NONE`, `imgsMissingAlt=3 of 3`. There is not one clickable phone number, one order button, or one cake inquiry form on the entire site.
4. **Nobody in this category has a real website.** Panadería El Globo (4.6★, 290 reviews, 35+ years), El Sol Bakery (4.1★, 145), Las Delicias (4.7★, 91) — all Facebook-only. The one competitor with a site, Smallcakes, runs a Weebly page that takes cake orders by *emailing a Gmail address*. The entire Richmond Latin-bakery market is undefended.

The current site scores **2.3 / 10**. Full scoring in §3.

---

## 1. CONTEXT BLOCK — VERIFIED CLIENT FACTS

### 1.1 Identity

| Field | Value | Source |
|---|---|---|
| Trading name | **La Sabrosita Bakery** | Own site, signage, GBP |
| Tagline (English, on logo) | "Pastries, Specialty Cakes and much more." | Client logo file |
| Tagline (Spanish, on street sign) | "Pan Dulce, Postres, Pasteles y Mucho Más" | Storefront photo on own site |
| Category | Bakery / panadería + Latin grocery | GBP category; multiple Google reviews describe an in-store grocery |
| Cuisine | Central American, South American, Puerto Rican and Mexican pastries | Own About page, verbatim |
| Owner / founder | **Argentina Ortega** (Salvadoran) | Own About page |
| Family named on site | Argentina Ortega · Jorge Dawson · Eduardo Dawson · Mario Dawson · Jenny Dawson (daughter-in-law) | Own About page |
| Service model | Counter service / retail case + custom cake orders + **wholesale distribution**. **No dine-in.** | GBP: Takeout ✓ Delivery ✓ Dine-in ✗ |
| Facility | 5,000 sq ft, next to the Virginia State Police headquarters on Midlothian Turnpike | Own About page |
| Staff | 11 employees *(figure is stale — see §7)* | Own About page |

### 1.2 NAP

| Field | Value |
|---|---|
| Address | 7730 Midlothian Turnpike, # A (Ste A), Richmond, VA 23235 — municipally North Chesterfield / Chesterfield County; USPS and Google both render "Richmond, VA 23235" |
| Plus code | FFX5+HX Richmond, Virginia |
| Coordinates | 37.4989876, −77.5400652 |
| Phone 1 | **(804) 562-8937** — listed on own Contact page, Facebook, Yelp, Grubhub, cakes.com |
| Phone 2 | **(804) 986-9695** — listed on own Contact page, Facebook, GBP, Tripadvisor, VisitRichmondVA, virginia.org |
| Email | **LaSabrositaBakery@gmail.com** — own Contact page |
| Website | www.lasabrositabakery.com (iWeb 3.0.4, built ~2010) |
| Facebook | facebook.com/p/La-Sabrosita-Bakery-100063568330828 — 3.9K followers |
| Instagram | instagram.com/lasabrositabakery |
| Google Business Profile | **UNCLAIMED** — 4.3★, 663 reviews, price band $1–20 |

> Two phone numbers on every listing with no stated purpose is a conversion leak and a NAP-consistency problem. One must become the public number; the other becomes wholesale/catering or gets retired. See §7.

### 1.3 Hours — THREE CONFLICTING SETS

| Source | Mon–Sat | Sun |
|---|---|---|
| Own website (Contact_Us.html) | 7 AM – 9 PM | 7 AM – 8 PM |
| Google Business Profile (crowd-sourced, unclaimed) | 7 AM – 8 PM | 7 AM – 7 PM |
| Facebook page | 7:00 AM – 8:00 PM every day | 7:00 AM – 8:00 PM |
| DoorDash storefront | 7:30 AM – 7:10 PM | — |

Four sources, four answers. This is actively costing them walk-ins at 8 PM and generating one-star "they were closed" reviews. **Highest-priority client confirmation.**

### 1.4 Products — as published on their own PRODUCTS page

Captured verbatim from `lasabrositabakery.com/Products/Products.html`. **These prices are stale — see the warning under the table.** Spelling below is theirs, including the typos.

| Item (as written) | Listed price |
|---|---|
| Apple Pies 9" / Pasteles de Manzana 9" | $8.99 |
| Alfajores Caramel / Cookies with Caramel | $0.99 |
| Bread Puddin / Budin de Pan | $1.59 |
| Bread Puddin with Raisins / Budin de Pan con Pasas | $1.59 |
| Brownies | $1.39 |
| Cannoli | $2.29 |
| Caramel Sponge with Wine Flavor / Torta Envinada | $1.49 |
| Cheese Custard / Flan de Queso | $3.50 |
| Cheese Cake Spanish style / Pastel de Queso | $1.59 |
| Cheese Sweet Bread sm. / Quezadilla Salvadoreña Pequeña | $1.00 |
| Cheese Sweet Bread 1/4 / Quezadilla Salvadoreña 1/4 | $1.79 |
| Cheese Sweet Bread 1/2 / Quezadilla Salvadoreña 1/2 | $3.39 |
| Cheese Sweet Bread Full / Quezadilla Salvadoreña Entera | $6.80 |
| Cheese Bread Large / Pan Queso Grande | $2.99 |
| Chesse Bread Small / Pan Queso Pequeno | $1.59 |
| Cinnamon Twist / Rollitos de Canela | $0.99 |
| Cinnamon Rolls / Rollos de Canela | $1.39 |
| Churros — plain, caramel filled, Bavarian crème | $1.29 |
| Coconut Filled Bread / Pan de Coco | $1.39 |
| Conchas / Shells Yeast Bread | $0.79 |
| Croissants filled — chocolate, almond, blueberry cream cheese, strawberry cream cheese, cream cheese | $1.49 |
| Croissants plain | $1.49 |
| Cookies Vanilla / Galletas de Vainilla | $1.69 |
| Coconut Macaroons / Cocada | $0.69 |
| Custard / Flan | $2.99 |
| Danish filled — strawberry, lemon, apple | $1.39 |
| Donuts — sugar, chocolate, glazed | $0.89 |
| Donuts filled | $1.09 |
| Elephant Ears / Orejas | $0.99 |
| Ginger Bread Pig Cookie / Marranitos | $0.89 |
| Guava Filled Sweet Bread / Pan Dulce con Guayaba | $1.39 |
| Jalapeño and Cream Cheese French Bread / Pan con Queso y Jalapeño | $1.29 |
| Magdalenas | $1.09 |
| Mexican Cookies / Polvorones | $0.79 |
| Mini Vanilla Muffins / Mini Quequitos de Vainilla | $0.69 |
| Pastelitos — Bavarian cream or pineapple | $0.89 |
| Pound Cake / Torta Alemana | $3.39 |
| Puff Pastries filled with Guava / Chicharrón de Guayaba | $1.49 |
| Puff Pastries filled with Guava, small / Chicharroncito de Guayaba | $0.49 |
| Puff Pastries filled with Mango / Chicharrón de Mango | $1.49 |
| Puff Pastries filled with Sweet Cream Cheese / Quesitos Puertorriqueños | $1.49 |
| Puff Pastries filled with Caramel / Pastel Gloria con Arequipe | $1.49 |
| Sweet Yeast Bread / Semita de Levadura | $0.79 |
| Sponge Cake with Figs and Peach / Pastel con brevas y durazno | $1.49 |
| Tres Leches Dessert / Postre Tres Leches | $2.99 |

Also listed on the About page under "Our Products": Occasion Cakes · Pastries · Cheese Bread · Diner Rolls · French Rolls · Bagels · Muffins · **"We cater!"**

> ### ⚠️ THE PRICE GAP
> Their own site says **Quesadilla Salvadoreña Entera = $6.80.** DoorDash today lists the same item at **$13.99.** Half a dozen more show the same pattern (site Tres Leches $2.99 vs. DoorDash Plain Tres Leches $5.99, Flan $2.99 vs. $6.99).
>
> Every price on that page is roughly **50% of reality**. Anyone who checks the website before driving over arrives expecting to pay half. That is a customer-service problem at the register, every day, and it is the single most embarrassing thing on the site. **Every price in the new build must be re-quoted by the client before launch. None of the numbers above go live.**

### 1.5 Current DoorDash pricing (verified 12 Aug 2026 — the live reference)

| Item | Price |
|---|---|
| Quesadilla Salvadoreña Entera / Full Cheese Sweet Bread | $13.99 |
| Media Quesadilla Salvadoreña / Half Cheese Sweet Bread | $7.99 |
| Banana Pudding Tres Leches | $7.50 |
| Flan / Custard | $6.99 |
| Oreo Tres Leches Cake | $6.50 |
| Plain Tres Leches — *"cake soaked in three kinds of milk: evaporated milk, condensed milk, and whole milk"* | $5.99 |

DoorDash "Most Ordered": **Tres Leches Cakes** and **Pan Dulce / Spanish Sweet Bread.** Those two are the hero products and drive the entire home page.

DoorDash store rating: 4.5 / 5 (50+ ratings). Marketplace hours shown as 7:30 AM – 7:10 PM.

### 1.6 Reputation — real, sourced, dated

| Platform | Rating | Volume |
|---|---|---|
| Google | **4.3** | **663 reviews** |
| DoorDash | 4.5 | 50+ ratings |
| Yelp | — | 85 reviews, 79 photos |
| Restaurantji | 3.8 | 161 reviews |
| Tripadvisor | 4.0 | 3 reviews (#475 of 1,514 Richmond restaurants) |
| Facebook | — | 3.9K followers |

**Google's own auto-extracted review themes:** tres leches cake (28 mentions) · birthday cake (16) · cake decoration (8) · churros (6).

Verbatim quotes cleared for use on the site *(pending the client's OK to display)*:

- *"Great prices, delicious food, and it felt like family there!"* — Google review summary
- *"Good selection of Mexican pastries, but its also a latin food grocery store."* — Google review summary
- *"Got my wife's tres leches birthday cake from them. Very affordable, beautifully decorated and delicious. Everyone I dealt with was incredibly friendly and helpful as well."* — Ricky Magner, Google, ~May 2026
- *"Large glass display shelves filled with variety of baked goods."* — Lin Brann, Google Local Guide (476 reviews), ~2022
- *"The cake was phenomenal, moist, and beautiful. Highly recommended to anyone looking for a specialty cake."* — Tripadvisor, Nov 2024
- *"The Assorted donuts, donas variadas are very yummy… Recommend to anyone who likes pastries!!"* — carnage m, DoorDash, 29 Mar 2026

**Press:** *Richmond Magazine*, "Richmond-Area Bakeries" — lists **La Sabrosita Bakery (Midlothian)**: *"Family-owned shop serving Latin American baked goods including sweet breads, conchas and churros."* This is a real, citable press mention and it appears nowhere on their website.

**The negative to plan around:** a 4-month-old 1-star Google review calling the pastries *"the driest and most bland."* Freshness is the vulnerability. The site must lean hard on *baked by hand every morning* and put times on it — "conchas out of the oven by 7 AM" — rather than making a generic quality claim.

### 1.7 Competitive set — Richmond

| Bakery | Google | Reviews | Website | Verdict |
|---|---|---|---|---|
| **La Sabrosita** | 4.3 | **663** | iWeb page from ~2010 | Most reviewed Latin bakery in the market. Worst digital presence of the group. |
| Panadería El Globo | 4.6 | 290 | **None** — Facebook only | 35+ years on Hull Street. Named in *Richmond Magazine*. Direct threat, zero web defense. |
| Panadería El Sol | 4.1 | 145 | **None** — Facebook only | No web presence. |
| Las Delicias Bakery | 4.7 | 91 | **None** — Facebook only | Highest rated, smallest volume. |
| Smallcakes Richmond | 4.7 | 430 | smallcakesva.com (Weebly) | Franchise cupcakery, different category. Nav: Home · Cupcake Flavors · Signature Cakes · Special Holidays · Special Orders. **No prices, no online ordering — custom cake orders go to a Gmail address.** Cites Food Network and USA TODAY. |

**The gap nobody is filling:** there is no searchable, bilingual, photographed, orderable Latin bakery menu in Richmond. Not one. Whoever builds it owns "pan dulce near me," "tres leches Richmond," "quinceañera cake Richmond," "panadería mexicana Richmond," and "concha Richmond VA" for the next five years. La Sabrosita has the review volume to win it immediately.

---

## 2. LOGO & BRAND TOKENS

### 2.1 What the logo actually is

A wheat-tan horizontal banner. Left: an orange filled circle containing a line-art baker's face wearing a white chef's toque. Right: **"La Sabrosita Bakery"** set in a heavy geometric sans (a Futura/Avant Garde-family bold, tight tracking), with **"Pastries, Specialty Cakes and much more."** beneath it in the same face at roughly 40% of the display size.

The street sign uses the same lockup with the Spanish line *"Pan Dulce, Postres, Pasteles y Mucho Más."* The Facebook avatar crops to the orange circle mark alone — **which confirms the circular baker mark already works as a standalone icon.** That is lucky and we will use it.

### 2.2 Sampled hex values — measured from the supplied file, not guessed

| Element | Measured | Notes |
|---|---|---|
| Banner background | **`#E2AA67`** | 20.6% of all pixels. Wheat / toasted crust. |
| Circle mark fill | **`#D16639`** | Dominant orange. Terracotta / burnt-sugar, not a candy orange. |
| Circle ring edge | `#CF6638` – `#D5683A` | Anti-aliasing spread on the ring. |
| Wordmark ink | **`#191918`** | Near-black with a warm bias. Not `#000000`. |
| Toque / highlights | **`#FFFFFF`** | Pure white. |

`#D16639` is a genuinely good accent — it is the color of caramelized sugar and it is warm enough to trigger appetite response without shouting. Most bakeries that try this land on a plasticky orange. Theirs is already right. **We keep it and build the whole system around it.**

### 2.3 Honest assessment of the logo

The **mark is an asset**; the **wordmark is not**.

- **Mark (the baker in the circle): keep.** It is distinctive, it survives at 32px as a favicon, it already works as a social avatar, and it draws itself beautifully as a signature animation — the toque, then the face, then the ring closing. That is our signature motion, derived from the brand exactly as it should be.
- **Wordmark: redraw.** It is a stock geometric bold with no personality and it is only available as a flattened raster. There is no SVG. At any size above a phone it will go soft.
- **Tagline: replace.** "Pastries, Specialty Cakes and much more." says nothing. "and much more" is the phrase a business uses when it has not decided what it is.

**Recommendation — the cheap, correct fix, not a rebrand:** redraw the existing mark as clean SVG (2–3 hours), and re-set the wordmark in a warm editorial serif so the brand reads *panadería* instead of *print shop*, keeping the exact same layout, the exact same colors, and the exact same baker. The customer will not perceive it as a new logo. They will perceive it as the same logo, in focus.

**Do not rebrand.** 663 reviews and a lit street sign on Midlothian Turnpike are equity. Sharpen it; do not throw it away.

### 2.4 Token set — light and dark

```css
/* ---- LA SABROSITA — BRAND TOKENS ---- */
/* Accent, wheat and ink are SAMPLED from the client's logo, not invented. */
/* Every pairing below was computed, not estimated. See the table underneath. */

:root {
  /* Light — the default. Warm paper. */
  --bg:            #FDFBF6;  /* bone, warmed — page canvas */
  --bg-alt:        #F6EFE2;  /* proof-drawer cream — alternating bands */
  --surface:       #FFFFFF;  /* cards, menu rows, the display case */
  --surface-sunk:  #F1E7D6;  /* inset wells, disabled fields */
  --ink:           #191918;  /* SAMPLED — headlines, body */
  --ink-muted:     #6B6157;  /* secondary copy, captions */
  --line:          #E4D8C4;  /* decorative hairlines only */
  --line-strong:   #A88F62;  /* functional borders: inputs, controls (3.00:1 ✓) */

  --accent:        #D16639;  /* SAMPLED — the one confident accent. Fills, badges,
                                graphic elements, large display type. NOT body text. */
  --accent-ink:    #191918;  /* text ON --accent — 4.75:1 ✓ AA. Ink on burnt orange
                                is also the more on-brand choice (bakery signage). */
  --accent-strong: #B85328;  /* filled buttons w/ white text (4.88:1 ✓) and
                                accent-colored link text on paper (4.72:1 ✓) */
  --accent-hover:  #9E4420;  /* pressed state — white on it = 6.36:1 ✓ */
  --accent-soft:   #F7E3D6;  /* accent-tinted chips and callout surfaces */

  --wheat:         #E2AA67;  /* SAMPLED — secondary warm: banners, dividers.
                                Ink on wheat = 8.53:1 ✓ AAA */
  --wheat-soft:    #F3E0C4;

  --success:       #3F6B43;  /* in stock, confirmed, paid — white on it 6.18:1 ✓ */
  --warn:          #C98A16;  /* low stock, tight lead time — INK on it 5.97:1 ✓ */
  --danger:        #A83232;  /* 86'd, cancelled, over budget — white 6.63:1 ✓ */
  --info:          #3F6F86;  /* neutral notices — white on it 5.48:1 ✓ */

  --radius-sm: 8px;  --radius: 14px;  --radius-lg: 28px;  --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgb(25 25 24 / .05);
  --shadow:    0 8px 24px -12px rgb(25 25 24 / .16);
  --shadow-lg: 0 24px 60px -28px rgb(25 25 24 / .28);
}

[data-theme="dark"] {
  /* Dark — the hero band, the footer, and the OS portal at 6 AM. */
  --bg:            #16130F;  /* dark oven */
  --bg-alt:        #1F1A15;
  --surface:       #241E18;
  --surface-sunk:  #120F0C;
  --ink:           #F7F1E6;  /* 16.47:1 on --bg ✓ AAA */
  --ink-muted:     #B7A996;  /* 8.05:1 ✓ AAA */
  --line:          #382E24;  /* decorative only */
  --line-strong:   #7A6850;  /* functional borders — 3.46:1 on bg, 3.08:1 on surface ✓ */

  --accent:        #E8794A;  /* lifted for dark — 6.41:1 as text on --bg ✓ AA */
  --accent-ink:    #16130F;  /* DARK text on the accent (6.41:1 ✓).
                                White on #E8794A is only 2.89:1 — never use it. */
  --accent-strong: #E8794A;
  --accent-hover:  #F08E62;
  --accent-soft:   #33211A;

  --wheat:         #E2AA67;
  --wheat-soft:    #3A2C1C;

  --success:       #6FA873;  /* 6.63:1 as text on --bg ✓ */
  --warn:          #E0AC46;  /* 8.96:1 ✓ */
  --danger:        #D96B6B;  /* 5.52:1 ✓ */
  --info:          #7FA9BF;
}
```

**Contrast — computed, not estimated.** Every pairing the build actually uses:

| Pairing | Ratio | Verdict |
|---|---|---|
| `--ink #191918` on `--bg #FDFBF6` | **17.01:1** | AAA |
| `--ink` on `--bg-alt #F6EFE2` | 15.39:1 | AAA |
| `--ink-muted #6B6157` on `--bg` | 5.85:1 | AA |
| `--ink` on `--accent #D16639` | **4.75:1** | AA — this is the default button treatment |
| `#FFFFFF` on `--accent-strong #B85328` | 4.88:1 | AA |
| `#FFFFFF` on `--accent-hover #9E4420` | 6.36:1 | AA |
| `--accent-strong` as link text on `--bg` | 4.72:1 | AA |
| `--ink` on `--wheat #E2AA67` | 8.53:1 | AAA |
| `--line-strong #A88F62` on `--bg` (non-text) | 3.00:1 | AA non-text ✓ |
| **dark** `--ink #F7F1E6` on `--bg #16130F` | 16.47:1 | AAA |
| **dark** `--accent #E8794A` as text on `--bg` | 6.41:1 | AA |
| **dark** `--accent-ink #16130F` on `#E8794A` | 6.41:1 | AA |
| **dark** `--line-strong #7A6850` on `--surface` (non-text) | 3.08:1 | AA non-text ✓ |

> **Two traps this table closes.** Raw `#D16639` as *text on paper* is only 3.58:1 — it fails AA for body copy, so accent-colored text resolves to `--accent-strong #B85328` instead. And `#FFFFFF` on the dark-mode accent `#E8794A` is 2.89:1 — a hard fail. On dark, text on the accent is always the dark ink. Both rules are encoded in the tokens above so the coding agent cannot get it wrong.

### 2.5 Typography

| Role | Face | Why |
|---|---|---|
| Display / headlines | **EB Garamond** (Google Fonts, free) | Warm old-style serif. Reads as *bakery* and as *heritage*, not as *startup*. Holds up at 96px and at 20px. Has real italics. Full Latin-Extended coverage — critical for *Quesadilla Salvadoreña*, *Piñata*, *Quinceañera*. |
| UI / body / prices | **Figtree** (Google Fonts, free) | Clean geometric workhorse with a warm bias. Tabular figures for prices and for every number in the finance portal. |
| Accent / labels | **EB Garamond Italic**, letter-spaced, small caps | Section eyebrows: *Del Horno* · *Pasteles* · *Pan Dulce*. |

Menu body copy never drops below **17px** — the buyer is often reading it standing at a counter, in Spanish, holding a child.

---

## 3. AUDIT OF THE CURRENT SITE — SCORED

All findings below were measured against the live DOM on 12 Aug 2026, not inferred.

| # | Dimension | Score | Finding | Fix |
|---|---|---|---|---|
| 1 | First impression & positioning | **2/10** | Title tag is `A Warm Welcome!`. Hero is a parking-lot snapshot of four family members in front of the store. Nothing on screen says Latin bakery, says Richmond, or names a single product. | New hero: tres leches or conchas coming out of the oven, one positioning line, Reserve-equivalent CTA = **Order a Cake**, secondary = **See the Menu**, with hours + neighborhood visible without scrolling. |
| 2 | Mobile UX | **1/10** | Content block is a **fixed 700px** absolutely-positioned iWeb layout. On a 390px phone it renders as a shrunk-to-fit desktop page. Nav is four 13px text links. No tap-to-call, no directions button, no sticky bar. | Mobile-first rebuild. Sticky bottom bar: **Order · Menu · Call · Directions.** 48px minimum tap targets. |
| 3 | Speed | **4/10** | Small in absolute bytes, but it loads **6 scripts and 2 stylesheets** of iWeb runtime to render 3 images and ~120 words. One image is a **630×1px spacer GIF**. No AVIF/WebP, no responsive `srcset`, no lazy loading. | Static/ISR Next.js. Budget: LCP < 2.0s, CLS < 0.05, Lighthouse ≥ 95 mobile on every page. |
| 4 | Conversion path | **0/10** | Measured: **`forms=0`, `buttons=0`.** Not one clickable phone link, order button, cake inquiry, or email capture anywhere on the site. The phone numbers on the Contact page are plain text — they are not even `tel:` links. | Every page gets one primary CTA. Cake configurator, pickup ordering, wholesale account request, email/SMS capture. |
| 5 | Menu accessibility | **5/10** | **Credit where it is due — the menu is real crawlable HTML text, not a PDF.** That already beats most bakery sites. But it is one undifferentiated bulleted list of 45 items, no sections, no photos, no dietary flags, no search, and the prices are ~50% below reality. | Sectioned, photographed, searchable, bilingual HTML menu with `Menu` / `MenuSection` / `MenuItem` schema. |
| 6 | Photography | **3/10** | **There is not one photograph of one product on the entire website.** For a bakery. The only two images are the logo banner and an exterior family snapshot. | Shot list in Part 2. Cheapest highest-return line item in the whole engagement. |
| 7 | Copy | **2/10** | The About page is a pasted third-person newspaper article, still in present tense, still saying *"three years ago"* and *"a bigger location is right in the horizon"* — describing a move that already happened. Welcome says *"over 9 years"*; Yellow Pages says 27; the same page says *"since… the early 90's."* Typos throughout: *peolple, Chesse, Quezadilla, Bread Puddin, "8 seven years."* | Rewrite in the family's own voice, first person, bilingual, with the real founding year confirmed. Argentina Ortega's story — home kitchen → 600 sq ft → 5,000 sq ft → 250 wholesale accounts — is genuinely excellent and it is currently buried in a typo'd press clipping. |
| 8 | Local SEO & schema | **1/10** | Measured: **zero JSON-LD. Zero Open Graph tags. No meta description. No canonical. Zero `<h1>`, `<h2>` or `<h3>` on any page** — every line of text is an absolutely-positioned `<div>`. All 3 images have empty `alt`. Page titles are `A Warm Welcome!`, `PRODUCTS`, `ABOUT US`, `Contact Us`. Sharing any URL to Facebook or iMessage produces a bare grey link. | Full schema: `Bakery` + `LocalBusiness` + `Menu`/`MenuSection`/`MenuItem` + `OpeningHoursSpecification` + `AggregateRating` + `FAQPage` + `BreadcrumbList` + `Organization`. All validated. |
| 9 | Google Business Profile | **2/10** | **UNCLAIMED.** 4.3★ / 663 reviews sitting under a *"Claim this business"* link. Hours are crowd-sourced and contradict the website and Facebook. No products, no menu link, no order link, no Posts, no Q&A, and **not one owner response to 663 reviews.** | Claim it in week 1, before any code. Full GBP checklist ships in Part 2. |
| 10 | Accessibility | **2/10** | No headings, no landmarks, no skip link, no alt text, text is positioned `<div>`s. A screen reader gets unstructured soup. Contrast on the tan/black banner is fine; nothing else is. | WCAG 2.2 AA throughout, keyboard pass on the order flow, screen-reader pass on the menu. |
| 11 | Trust signals | **3/10** | 663 Google reviews, a 4.5 DoorDash rating, a *Richmond Magazine* mention, 3.9K Facebook followers, and a Salvadoran family founder story — **none of it appears on the website.** | Proof strip in the hero region: review count + rating, *Richmond Magazine*, years in business, the family photo they already have. |

**Weighted overall: 2.3 / 10.**

### 3.1 The cost of the status quo

I will not invent their revenue. Here is the model with the levers exposed — plug in the real numbers from their DoorDash/Grubhub merchant statements and their POS.

**Lever 1 — marketplace commission.** DoorDash and Grubhub marketplace rates run roughly **15% on pickup and 25–30% on delivery** (confirm against their actual merchant agreement — rates vary by plan).

| Monthly marketplace volume | At 25% blended | Annual leakage |
|---|---|---|
| $3,000 | $750/mo | **$9,000** |
| $6,000 | $1,500/mo | **$18,000** |
| $10,000 | $2,500/mo | **$30,000** |

Direct pickup ordering on their own domain costs **Stripe's 2.9% + $0.30**. On $6,000/month that is ~$204 instead of ~$1,500. **The delta pays for the entire build inside the first quarter.** Keep DoorDash for genuine delivery reach — just stop paying commission on the customers who were already going to drive over.

**Lever 2 — the unclaimed GBP.** 663 reviews at 4.3 is a top-tier local asset that is currently unmanaged. A claimed, fully-populated profile with products, photos, Posts, Q&A and review responses typically moves local-pack impressions materially. It is free.

**Lever 3 — cake orders taken by phone.** Every custom cake is currently a phone call during service, transcribed by hand, with no deposit. Industry no-show/abandonment on undeposited custom orders is real money and real wasted labor. A configurator with a deposit converts at any hour, captures the spec in writing, and eliminates the "that's not what I said" conversation at pickup.

**Lever 4 — the invisible wholesale book.** ~250 accounts with no online line sheet, no reorder portal, and no order history. Every reorder is a phone call. A wholesale portal with saved carts and standing orders is the highest-leverage single feature in this entire project, and no competitor in the market has anything like it.

**Lever 5 — quinceañera and wedding cakes.** The highest-ticket product they sell has no page, no gallery, no pricing guide, no lead-time policy, and no inquiry form. Google review data shows "birthday cake" and "cake decoration" among the top mentioned themes — demand is already there and being handled by phone.

---

## 4. THE PLAN

### 4.1 Positioning line

**Recommended:**
> **Pan dulce, tres leches, and cakes for every quinceañera on Midlothian Turnpike — baked by hand every morning since Argentina Ortega opened her kitchen.**

Mobile hero cut (short enough for a 390px screen):
> **Baked by hand every morning. Richmond's panadería since [YEAR].**

Spanish:
> **Pan dulce, tres leches y pasteles hechos a mano cada mañana. Tu panadería en Midlothian Turnpike.**

*(Founding year is bracketed until confirmed — see §7.)*

### 4.2 Design direction — three real Refero Styles candidates

I pulled these from styles.refero.design and read their actual DESIGN.md token sets.

| | Style | Refero description | Fit |
|---|---|---|---|
| **A ★** | **Wispr Flow** — `styles.refero.design/style/ac53825c-1e06-4ae0-8489-cace5c5e0339` | *"cream broadsheet, dark velvet chambers."* Warm cream canvas `#ffffeb`, EB Garamond at 48–120px display weights, Figtree for interactive surfaces, alternating bright-cream and near-black chambers, 2px ink borders, 40–80px corner radii, disciplined four-color palette with an **ember orange `#ffa946`** accent. | **RECOMMENDED.** The cream/ember/near-black structure maps almost one-to-one onto `#E2AA67` wheat, `#D16639` terracotta, and `#191918` ink. It already specifies EB Garamond + Figtree — the exact pairing this brand needs. The alternating cream/dark chambers give us a free rhythm for Menu → Cakes → Story → Wholesale. Swap ember orange for `#D16639`, swap lavender out entirely, and the merge is nearly free. |
| **B** | **Steep** — `styles.refero.design/style/75fdb89f-ca64-41b3-af36-7a78bd09448e` | *"serif analytics on warm paper."* Serif Signifier headlines on a near-monochrome white canvas, a single warm peach accent `#fbe1d1`, 24px radius soft cards, pill controls, barely-there shadows, hairline borders. | Strong, calmer, more "modern patisserie." But near-monochrome white is cooler than this brand should be — it reads Nordic bakery, not panadería. Good fallback if the client finds Wispr Flow too high-contrast. |
| **C** | **ORYZO AI** — `styles.refero.design/style/1f204e95-454a-437e-845b-c1b169d35607` | *"Darkroom product editorial."* Dark, moody, single-subject product photography under one light. | The most beautiful of the three and the wrong one. A dark room reads fine-dining pastry counter; La Sabrosita is a bright morning bakery where people buy $0.79 conchas. Reserve this treatment for the **Wedding & Quinceañera Cakes** page only, as a deliberate tonal shift. |

**For the Bakery OS portal — separate style, same family:**
**Seline Analytics** — `styles.refero.design/style/7967c6d9-e50c-42b5-b4d1-74003ba41781` — *"Quiet analyst's desk on warm paper."* Warm-stone canvas `#fafaf9`, 1px stone hairlines as the primary structural device, flat white cards on a single 16px-blur shadow, pill controls, one vivid accent. Swap its cyan for `#D16639` and the back office sits in the same warm world as the storefront without looking like a marketing page. Numbers stay legible at 6 AM under fluorescent light, which is when they will actually be read.

**Signature motion** (one move, derived from the brand, repeated):
The circular baker mark **draws itself** — ring, then toque, then face — as the page-load state and again as the section divider between chambers. On scroll, menu sections *"plate"* in: the card lifts 12px and settles as if set down on a counter. Steam rises off the hero on a slow loop. GSAP ScrollTrigger + Lenis for choreography, Framer Motion for the order stepper, no React Three Fiber anywhere in this build — a bakery menu does not earn a 3D engine. Everything is `transform`/`opacity` only, with a `prefers-reduced-motion` off-ramp on every animation.

### 4.3 Bilingual is not optional

This is a Salvadoran-founded panadería serving a Spanish-speaking customer base, wholesaling to ~250 Hispanic grocery stores, with product names that only exist in Spanish. **Full ES/EN from day one**, not a Google Translate widget:

- `next-intl` with real `/es` and `/en` routes, `hreflang` alternates, and locale-aware `sitemap.xml`.
- Product names carry both fields natively — `name_es` and `name_en` are columns in the database, not a translation layer. *Quesadilla Salvadoreña* is the name; "Cheese Sweet Bread" is the gloss.
- Language auto-detects from `Accept-Language`, with a persistent manual toggle in the header.
- **This alone will win them search traffic no competitor is contesting:** *panadería cerca de mí*, *pan dulce Richmond*, *pastel de quinceañera Richmond*.

### 4.4 Sitemap

**Phase 1 — the storefront**
```
/                      Home
/menu                  The Case — full bilingual menu, sectioned, photographed, searchable
  /menu/pan-dulce        Conchas, semitas, marranitos, orejas, magdalenas
  /menu/pasteles         Tres leches, flan, budín, pound cake, cheesecake
  /menu/quesadilla       Quesadilla Salvadoreña (sm / ¼ / ½ / entera) — hero product, own page
  /menu/pan-salado       Pan queso, French rolls, dinner rolls, jalapeño & cream cheese
  /menu/hojaldres        Chicharrones de guayaba/mango, quesitos, pastel gloria
  /menu/donas-galletas   Donuts, polvorones, alfajores, cocadas, brownies
/cakes                 Custom Cakes — gallery, sizes, flavors, lead times, pricing guide
  /cakes/quinceanera
  /cakes/wedding
  /cakes/birthday
/order                 Pickup ordering (Phase 2)
/cakes/order           Cake configurator (Phase 2)
/wholesale             Line sheet + account request  ← the sleeper
/catering              Trays, events, office orders
/nuestra-historia      Our Story — Argentina Ortega and the family
/visitanos             Visit Us — hours, map, directions, parking
/gift-cards
/careers
/faq
```
Every page mirrored at `/es/...`. Every page carries the sticky mobile bar: **Order · Menu · Call · Directions.**

**Phase 3 adds:** `/journal` (seasonal — Día de los Muertos pan de muerto, rosca de reyes, Semana Santa), `/loyalty`.

### 4.5 The Bakery OS — replaces the reservation system

A bakery does not need tables and turn times. It needs to know what it has, what it costs, what it sold, and what it made. Three surfaces, one database.

**A. Guest surface (public)**
- **Custom cake configurator** — occasion → size/servings → tiers → cake flavor → filling → frosting → inscription → color/theme → photo upload for reference → **pickup date & time constrained by real lead-time rules** (e.g. 48h standard, 7 days for tiered/fondant, blackout on Mother's Day / Día de las Madres / graduation weekends) → contact → **Stripe deposit**. Live price preview as options change. Under 90 seconds on a phone.
- **Everyday pickup ordering** — dozen conchas, a full quesadilla, two dozen assorted for the office. Real-time availability driven by the 86 flag. Pickup-window picker respecting bake schedules — *"conchas out at 7 AM; order by 9 PM for next-morning pickup."*
- **Order status by magic link** — no account required. Modify, cancel (inside the policy window), add a note, confirm.
- **Wholesale account request** — store name, DBA, address, resale certificate upload, delivery day preference. Routes into the admin pipeline.
- **Catering & large-order inquiry** with minimums and lead-time rules stated up front.
- Full WCAG 2.2 AA, keyboard-navigable, fast on a five-year-old Android.

**B. Staff surface (authenticated)**
- **Production board** — today's bake list by station, aggregated across every open order plus the standing case par levels. Realtime across devices.
- **Order queue** — new → confirmed → in production → decorating → ready for pickup → picked up. Plus late, no-show, refunded.
- **Cake job tickets** — printable, with the reference photo, the inscription spelled exactly as the customer typed it, the allergy note, and the pickup time.
- **86 an item** in two taps; it disappears from the public menu instantly.
- **Waste & shrink log** — end-of-day, per item, with a reason code. This is what makes the food-cost number real.
- **Shift notes** — what's out, what's short, who's picking up a wedding cake at 2 PM.
- Roles: counter · baker · decorator · manager · owner.

**C. Owner / admin surface — inventory + finances (the retainer product)**
- **Ingredient inventory** — flour, sugar, butter, queso, guava paste, evaporated/condensed milk, boxes, ribbon, cake boards. Purchase unit vs. recipe unit with **explicit conversion factors** (a 50 lb flour sack → grams), current on-hand, par level, reorder point, lot/expiry where it matters, and a low-stock alert queue.
- **Recipes / bill of materials** — every product maps to its ingredients at yield. Change the price of butter once and **every item's food cost and margin re-computes across the whole catalog.** This is the single most valuable screen in the build and the reason it must be Next.js + Postgres rather than a no-code tool.
- **Food cost & margin per item** — cost, price, margin %, contribution margin, and a plain-English flag when an item is being sold at a loss. Nine out of ten independent bakeries have at least one.
- **Production planning** — required batches for tomorrow from open orders + par levels, and the ingredient draw-down that implies. Tells them what to buy before they run out mid-bake.
- **Vendor & purchase orders** — vendor records, price history per ingredient, PO create → sent → received (with partial receipts) → invoice matched. Receiving updates inventory automatically.
- **Waste tracking** — value of what got thrown out, by item, by week. Usually the fastest money a bakery ever finds.
- **Daily sales & cash reconciliation** — register close, cash counted vs. expected, card totals, online orders, wholesale invoices, variance flagged.
- **Expenses** — categorized (COGS · labor · rent · utilities · packaging · marketing · equipment · insurance), receipt image upload, recurring entries.
- **Financial reporting** — P&L by month, food-cost %, labor %, prime cost, gross margin trend, best/worst sellers by margin *and* by volume (they are rarely the same item), sales by channel (walk-in · online pickup · wholesale · DoorDash · Grubhub), **and a running "commission saved vs. marketplace" counter.** That last number is what renews the retainer every year.
- **Wholesale management** — accounts, per-account price lists, standing orders, delivery routes by day, invoices, aging receivables. The 250-store book, finally on a screen.
- **Menu & content management** — sections, items, bilingual names and descriptions, prices, photos, dietary flags, seasonal availability windows, 86 toggle. Publishing a price change updates the live site and the JSON-LD schema together.
- **Audit log** on every destructive or financial action. **CSV export** of everything — they own their data, and we say so in the contract.

**Non-negotiable engineering requirements**
- **No overselling a limited item, ever.** Inventory decrements and order writes go through a single transactional, race-safe path — a Postgres function with row-level locking, not an optimistic client-side check. Must pass a concurrent-order test.
- **Timezones explicit.** Store UTC, render `America/New_York`. Test a pickup slot booked across the November DST boundary.
- **Row-level security** so staff can never read another tenant's data and no guest can read another guest's order. Magic links are single-purpose, expiring, and rate-limited.
- **Money is `numeric(12,2)`, never a float.** Quantities are `numeric(14,4)`. Unit conversions are explicit rows, never hard-coded.
- **Offline-tolerant staff view** — the production board keeps working from local state if the shop WiFi drops and syncs on reconnect.
- **PCI:** Stripe Elements / Payment Intents only. We never touch a card number.
- **SMS compliance:** explicit opt-in with disclosure, STOP/HELP handling, quiet hours. A2P 10DLC registration documented in the handoff.
- **Demo/seed mode:** one command seeds a realistic week — orders, ingredients, recipes, vendors, sales, expenses — so you can demo a fully working Bakery OS to Argentina and her sons before they hand over a single credential.

### 4.6 Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui + Radix · Framer Motion · GSAP (ScrollTrigger, SplitText) + Lenis · `next-intl` · Supabase (Postgres + Auth + RLS + Realtime + Storage) · Stripe (deposits, pickup orders, gift cards) · Resend (email) + Twilio (SMS) · Zod + React Hook Form · TanStack Query · Recharts for the finance dashboards · deployed on Vercel. Marketing pages static/ISR; portals client-rendered behind auth.

**Professional disagreement, stated once and plainly:** if anyone suggests building the inventory/finance side in Lovable, Bolt, or a no-code tool, that is wrong and it will have to be rebuilt. Unit-conversion math, BOM cost rollups, race-safe stock decrements, RLS across four roles, and P&L aggregation are exactly the workloads those tools cannot finish. The marketing site could be prototyped there. The OS cannot. You chose Claude Code + Cursor, which is correct.

### 4.7 Phases

| Phase | Window | Ships | Revenue effect |
|---|---|---|---|
| **0 — Free wins** | Week 1, before code | Claim the GBP. Reconcile the three hours sets. Fix NAP everywhere. Re-quote all 45 prices. Respond to the last 20 Google reviews. | Immediate local-pack lift, zero build cost |
| **1 — Storefront** | Weeks 1–3 | Bilingual marketing site, real photographed sectioned menu, cakes gallery, story, visit page, full schema, sticky mobile CTA bar | Stops the bleeding; wins the search terms nobody is contesting |
| **2 — Ordering** | Weeks 3–5 | Cake configurator + deposits, everyday pickup ordering, magic-link order status, email/SMS notifications | Starts killing marketplace commission |
| **3 — Bakery OS** | Weeks 5–9 | Inventory, recipes/BOM, food cost, production planning, vendors/POs, waste, daily sales, expenses, P&L dashboard | The retainer. The reason they never leave. |
| **4 — Wholesale & growth** | Weeks 9–12 | Wholesale portal (line sheet, standing orders, invoices, routes), loyalty, gift cards, seasonal content engine | The 250-account book, digitized |

### 4.8 Upsell modules

Loyalty (buy 11 conchas get one — the classic *docena de panadero*) · gift cards · seasonal pre-order campaigns (rosca de reyes in January, pan de muerto in October, Semana Santa) · catering and office-tray subscriptions · a wholesale line-sheet portal · email/SMS marketing to segments (lapsed 90 days, birthdays this month, wholesale accounts who have not reordered) · recipe/journal content engine · Google Business Profile management retainer · monthly food-cost review as a service.

---

## 5. WHAT SHIPS IN PART 2

Once you confirm the direction in §4.2, the full build package follows in this order:

1. **DESIGN.md** — merged Refero style + the sampled brand tokens above. The styling source of truth.
2. **PROMPT 01** — Project scaffold, dependency list with pinned versions, folder structure, env vars, Tailwind v4 theme, `next-intl` setup.
3. **PROMPT 02** — Database schema + RLS + seed. Full runnable SQL, parse-verified.
4. **PROMPT 03** — Home page.
5. **PROMPT 04** — Menu system (all six sections, bilingual, searchable, schema'd).
6. **PROMPT 05** — Cakes pages + gallery.
7. **PROMPT 06** — Story, Visit, Catering, FAQ, Careers.
8. **PROMPT 07** — Cake configurator + lead-time engine (rules, algorithm, race-safety, test cases).
9. **PROMPT 08** — Everyday pickup ordering + cart + Stripe checkout.
10. **PROMPT 09** — Staff portal: production board, order queue, 86, waste log.
11. **PROMPT 10** — Admin: inventory + unit conversions + vendors + POs.
12. **PROMPT 11** — Admin: recipes/BOM + food cost + margin engine.
13. **PROMPT 12** — Admin: daily sales, expenses, P&L, dashboards.
14. **PROMPT 13** — Wholesale portal.
15. **PROMPT 14** — Notifications: every email and SMS template written out in full, both languages.
16. **PROMPT 15** — SEO, schema, analytics, metadata, sitemaps, hreflang.
17. **PROMPT 16** — QA & hardening: acceptance checklist, test matrix, performance budget.
18. **Deployment & handoff** — env vars, Stripe/Resend/Twilio setup, DNS, GBP checklist, plain-English admin guide (in English and Spanish, because Argentina will be the one using it).
19. **Asset brief** — Higgsfield prompts for atmosphere/texture/motion plates + the real-photography shot list.
20. **Pitch material** — the money math in a one-pager you can put in front of the owner.

---

## 6. IMMEDIATE ACTIONS THAT COST NOTHING

Do these this week regardless of when the build starts:

1. **Claim the Google Business Profile.** 663 reviews are sitting unmanaged. Verify by postcard or phone.
2. **Pick one set of hours** and push it to Google, Facebook, the website, DoorDash, Grubhub, Yelp, Apple Maps, Bing Places.
3. **Pick one public phone number.** Route the other to wholesale/catering or retire it.
4. **Re-quote all 45 prices.** The current published list is roughly half of reality.
5. **Respond to the last 20 Google reviews** — including the 1-star. A short, warm, non-defensive owner reply on a bad review is worth more than the review cost.
6. **Add products and a menu link to the GBP** once claimed. Upload 20 photos of actual product.

---

## 7. CONFIRM WITH CLIENT

Every item below is unverified or contradictory. Nothing here goes live until Argentina or one of the sons confirms it in writing.

**Critical — blocks launch**

1. **Hours.** Four sources disagree (§1.3). What are the real open/close times, seven days? Any different holiday hours? Is there a bake-out time when the case is fullest?
2. **All 45 prices.** The published list is ~50% below the DoorDash prices. Every single price must be re-quoted. Nothing from §1.4 ships as-is.
3. **Phone numbers.** Which of (804) 562-8937 and (804) 986-9695 is the primary public line? What is the other one for?
4. **Founding year.** The site says "over 9 years," "three years ago," and "since the early 90's" in three places. Yellow Pages says 27 years in business. What is the actual year Argentina started, and the year they moved to 7730 Midlothian?
5. **Legal entity name** for the footer, invoices, and Stripe.

**Products & menu**

6. Is the 45-item list still accurate? What has been added or dropped since it was written?
7. **Tamales, pupusas, churros españoles, and prepared food** appear in reviews and third-party listings but not on their own menu. Do they sell them? What else is in the case that the site never mentions?
8. **The grocery side.** Multiple Google reviewers describe an in-store Latin grocery. Is that a real, merchandised business line we should build a page for?
9. Custom cake pricing structure — price per serving? By size and tier? Minimum? What does a quinceañera cake actually start at?
10. **Cake lead times** — standard, tiered, fondant, photo cakes. And blackout dates (Mother's Day / Día de las Madres, graduation weekends, Christmas).
11. Cake flavors, fillings, and frostings — the exact list that goes into the configurator dropdowns.
12. **Allergen and dietary flags.** We will publish nothing here until the client provides it in writing. Every menu ships with the standard cross-contamination disclaimer.

**Wholesale — the big one**

13. Is the wholesale business still ~250 accounts? What is the real number today?
14. Delivery territory, delivery days, minimums, and the wholesale price list.
15. Is there a resale-certificate requirement for new accounts?
16. Do they want the wholesale portal public, or gated behind approved accounts only?

**Operations**

17. Current POS — Toast, Square, Clover, or a cash register? This determines whether daily sales entry is manual or imported.
18. Current DoorDash and Grubhub commission rates, from the merchant statements. Needed for the honest savings math.
19. Do they already track inventory or recipes anywhere — a spreadsheet, a notebook, in someone's head?
20. Who will actually use the admin portal day to day, and in which language? (This decides whether the admin UI ships bilingual too — my assumption is **yes**.)
21. Employee count today (the site's "11" is from ~2010).

**Brand & assets**

22. Do they have the logo as vector/SVG/AI/EPS, or only the raster banner? *(My working assumption: raster only.)*
23. Approval to redraw the wordmark in a serif while keeping the baker mark and colors exactly as they are.
24. Do they have any professional food photography? *(Assumption: no. Shot list ships in Part 2.)*
25. Approval to display the specific review quotes in §1.6 with attribution.
26. Instagram handle confirmation and permission to pull the feed onto the site.
27. Domain: keep `lasabrositabakery.com` and point it at Vercel? Who controls the registrar and DNS?
28. Policies for the FAQ page: parking, deposit and cancellation terms on custom cakes, refund policy, order-change window.

---

*Verification note: every DOM measurement in §3 (`forms=0`, `buttons=0`, `h1=0`, `jsonLd=0`, `ogTags=0`, `imgsMissingAlt=3/3`, fixed 700px layout, 630×1px spacer image) was executed against the live site on 12 Aug 2026. The colors in §2.2 were sampled pixel-by-pixel from the supplied logo file, not estimated. Every review quote, rating, and review count carries its source and date. No price, award, allergen claim, or contact detail in this document was invented — where a fact was unavailable or contradictory, it is listed in §7 instead of guessed.*
