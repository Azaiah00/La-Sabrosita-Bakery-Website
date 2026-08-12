# PROMPT 06 — Story, Visit, Catering, Gift Cards, Careers, FAQ, error states

> Requires PROMPT 01–05. Read `DESIGN.md` before starting.

---

## Goal

Build the remaining content pages plus every empty, loading, 404 and 500 state, in both locales.

## Files to create

```
src/app/[locale]/nuestra-historia/page.tsx
src/app/[locale]/visitanos/page.tsx
src/app/[locale]/catering/page.tsx
src/app/[locale]/tarjetas-regalo/page.tsx
src/app/[locale]/empleos/page.tsx
src/app/[locale]/faq/page.tsx
src/app/[locale]/not-found.tsx
src/app/[locale]/error.tsx
src/app/[locale]/loading.tsx
src/components/marketing/hours-table.tsx
src/components/marketing/inquiry-form.tsx
src/components/marketing/empty-state.tsx
src/lib/hours.ts
```

---

## `/nuestra-historia` — Our Story

The current About page is a pasted third-person newspaper article, still in present tense, still saying *"three years ago"* and *"a bigger location is right in the horizon"* about a move that already happened, with typos throughout (*peolple, Chesse, 8 seven years*). It is also, underneath all that, a genuinely excellent story. Rewrite it in the family's own voice.

**ES:**

> ## Empezó en una cocina
>
> Argentina Ortega compró una panadería de 600 pies cuadrados y empezó con cuatro clientes. Horneaba pan dulce centroamericano, sudamericano, puertorriqueño y mexicano por la mañana, y lo repartía a tiendas de Richmond por la tarde.
>
> ## Hoy surtimos a más de 250 tiendas
>
> Nuestro pan llega a tiendas en Virginia, la Costa Este y Elizabeth City, Carolina del Norte. La panadería se mudó a un local de 5,000 pies cuadrados en Midlothian Turnpike, al lado del cuartel de la policía estatal.
>
> ## Sigue siendo la familia
>
> Argentina. Jorge. Eduardo. Mario. Jenny. Los hijos dejaron la construcción para invertir en el negocio de su mamá.
>
> ## Y todavía se hace a mano
>
> Cada mañana, con las mismas recetas. Las conchas salen a las 7.

**EN:** same structure, same facts, natural English — not a literal translation.

Layout: alternating text/image bands. Use the existing family photograph. Add a `CONFIRM WITH CLIENT` note in the code (not on the page) for the founding year and the current store count.

**Do not** publish the founding year until it is confirmed — the client's own materials say "over 9 years," "three years ago," and "since the early 90's," and Yellow Pages says 27 years. Render it through `CONFIRM_WITH_CLIENT`.

Emit `AboutPage` + `Organization` JSON-LD with `founder: { "@type": "Person", "name": "Argentina Ortega" }`.

---

## `/visitanos` — Visit Us

- H1 **ES:** *Visítanos* · **EN:** *Visit us*
- Address, both phone numbers with `tel:` links and explicit labels, email as `mailto:`.
- **Full weekly hours table** from `opening_hours`, with today's row highlighted and a live *"Abierto ahora"* / *"Cerrado · Abre mañana a las 7:00"* status computed server-side in `America/New_York`, accounting for `special_hours`.
- A large **Cómo llegar** button → Google Maps directions to the Plus Code `FFX5+HX Richmond, Virginia`.
- Static map image, not an interactive embed. Links out.
- Parking, accessibility, and the "next to the Virginia State Police headquarters" landmark — it is the most useful direction anyone can give for this address.
- `LocalBusiness` + `OpeningHoursSpecification` JSON-LD, including `specialOpeningHoursSpecification` for holidays.

### `src/lib/hours.ts`

```ts
/**
 * All hours logic is DST-correct and runs against America/New_York.
 * Never uses the server's local timezone. Never uses new Date(string).
 */
export function getTodayHours(
  openingHours: OpeningHours[],
  specialHours: SpecialHours[],
  now: Date
): { open: boolean; opensAt: string | null; closesAt: string | null; closedReason: string | null }

export function getWeekHours(...): WeekRow[]
export function isOpenNow(...): boolean
export function nextOpenAt(...): Date | null
```

---

## `/catering` — Catering & large orders

Their own About page ends with **"We cater!"** and there is currently no catering page anywhere. Build it.

- Trays and party volumes: assorted pan dulce trays, dozen pricing, quesadilla platters, tres leches for a crowd.
- Minimums and lead times from `lead_time_rules` where `applies_to = 'catering'` (72 hours seeded).
- Office and church standing-order pitch.
- `inquiry-form.tsx`: name, phone, email, date needed, headcount, what they're thinking, and an optional note. Five required fields, nothing more. Zod-validated, honeypot + rate-limited, writes an `order` row with `order_type = 'catering'` and `status = 'draft'`, then emails the shop and confirms to the customer.

---

## `/tarjetas-regalo` — Gift cards

Phase 2 wires Stripe. In this prompt, build the page and the "notify me" capture:

- Explain denominations and how redemption works at the counter.
- If `settings.gift_cards_enabled` is false, render an honest coming-soon state with an email capture — never a dead "Buy" button.
- Balance-check form: enter a code → calls a rate-limited server action that hashes the code and reads `gift_cards.balance`. **Never returns the code, the purchaser, or the recipient.** Three attempts per IP per minute, then a cooldown.

---

## `/empleos` — Careers

Small, honest page. Roles the bakery actually staffs: panadero/a, decorador/a, mostrador, reparto. A short form (name, phone, position, availability, a free-text note) plus a clear line that walking in and asking is also fine — because for this business, it is. Bilingual, Spanish-first, and the form must work for someone who reads only Spanish.

---

## `/faq` — Site-wide FAQ

Eight questions, all answerable from confirmed facts or clearly routed to a phone call:

1. ¿A qué hora sale el pan? / What time does the bread come out?
2. ¿Toman pedidos por teléfono? / Do you take phone orders?
3. ¿Con cuánta anticipación debo pedir un pastel? / How far ahead for a cake?
4. ¿Cuál es la política de depósito y cancelación? / Deposit and cancellation policy?
5. ¿Tienen estacionamiento? / Is there parking? — **client-confirmed**
6. ¿Hacen entregas? / Do you deliver? — **client-confirmed**
7. ¿Puedo abrir una cuenta de mayoreo? / Can I open a wholesale account?
8. ¿Aceptan tarjeta? / Do you take cards?

Emit `FAQPage` JSON-LD matching the visible text exactly. Any answer not yet confirmed renders as *"Llámanos al (804) 986-9695"* and is excluded from the JSON-LD rather than guessed.

---

## Error, empty and loading states — design every one

| State | Treatment |
|---|---|
| **404** | Paper chamber. **ES:** *Esta página se nos quemó.* / **EN:** *This page came out burnt.* Plus links to Menú, Pasteles, Visítanos, and the phone number. Real 404 status code. |
| **500** | Same warmth, no stack trace, no error code shown to the user. A "try again" button and the phone number. Logged server-side. |
| **Loading** | Skeletons that match the real layout's dimensions exactly, so nothing shifts when content arrives. Never a centered spinner. |
| **Empty menu category** | *"Todavía no hay nada en esta sección."* + link to the full menu. |
| **Empty search** | *"No encontramos «X». Prueba con «concha», «tres leches» o «quesadilla».»"* with those three as clickable chips. |
| **Offline** | A minimal offline notice on the portal routes only. The marketing site is static and works from cache. |

Every state exists in both locales and is reachable in a manual test.

## Acceptance criteria

- [ ] Every page renders in `/es` and `/en`, checked at 320px, 390px, 768px and 1440px.
- [ ] Lighthouse mobile ≥ 95 on every page in this prompt.
- [ ] Hours status is correct: verify by temporarily setting the system clock or by unit-testing `isOpenNow` across a Sunday close, a weekday close, and a `special_hours` closed day.
- [ ] `getTodayHours` has a unit test covering the DST fall-back Sunday and the spring-forward Sunday.
- [ ] Every form: Zod-validated, honeypot present, rate-limited, errors announced via `aria-live`, every field labelled, keyboard-completable.
- [ ] The gift-card balance check never leaks a code and is rate-limited — verify by attempting four rapid lookups.
- [ ] 404 returns HTTP 404, not 200.
- [ ] All JSON-LD validates clean.
- [ ] No unconfirmed fact appears as an assertion anywhere. Grep for `CONFIRM_WITH_CLIENT` and confirm every soft fact routes through it.

## What NOT to do

- Do not publish the founding year, parking details, delivery policy, or any dietary answer until the client confirms them.
- Do not paste the old newspaper article. Rewrite it.
- Do not use a centered spinner as a loading state.
- Do not show a raw error message or stack trace to a customer.
- Do not build a "Buy gift card" button that does not work.
- Do not require an email address on the careers form — a phone number is enough.
