# PROMPT 14 — Notifications: every email and SMS template, written out in full

> Requires PROMPT 01–13.

---

## Goal

Every transactional message the system sends, in Spanish and English, plus the cron jobs that send them, plus TCPA-compliant SMS handling.

Spanish is the default. English is sent when `orders.locale = 'en'` or `customers.locale = 'en'`.

## Files to create

```
src/lib/email.ts
src/lib/sms.ts
src/lib/notifications/send.ts
src/lib/notifications/templates/index.ts
src/emails/                                 # React Email components
  layout.tsx
  order-confirmed.tsx
  cake-confirmed.tsx
  order-ready.tsx
  order-reminder.tsx
  order-cancelled.tsx
  review-request.tsx
  wholesale-welcome.tsx
  wholesale-order-confirmed.tsx
  wholesale-invoice.tsx
  standing-order-notice.tsx
  catering-inquiry-received.tsx
  win-back.tsx
src/app/api/cron/reminders/route.ts
src/app/api/cron/standing-orders/route.ts
src/app/api/cron/abandoned-carts/route.ts
src/app/api/cron/review-requests/route.ts
src/app/api/sms/inbound/route.ts
vercel.json                                 # cron schedules
```

---

## Infrastructure

**Email** — Resend, with React Email. From `La Sabrosita Bakery <pedidos@lasabrositabakery.com>`. Reply-to `LaSabrositaBakery@gmail.com` until a real mailbox exists.

**SMS** — Twilio. **A2P 10DLC registration must be completed before a single production SMS is sent.** Note it in the handoff.

**Every send writes a `messages_log` row** with channel, template key, locale, recipient, status, and provider id. That log is how you debug "the customer says they never got it," and it is also the compliance record.

**Retries:** one retry after 60 seconds on a transient failure, then mark `failed` and surface it in the admin. Never retry a message that the provider rejected as invalid.

---

## SMS compliance — non-negotiable

1. **Explicit opt-in.** An unchecked checkbox at the point of collection, with this exact disclosure visible next to it, not behind a link:

   **ES:** *Acepto recibir mensajes de texto de La Sabrosita Bakery sobre mi pedido. Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda.*
   **EN:** *I agree to receive text messages from La Sabrosita Bakery about my order. Message and data rates may apply. Reply STOP to cancel, HELP for help.*

2. **`customers.sms_opt_in_at` is stamped** at the moment of consent. The schema's check constraint enforces that opt-in without a timestamp is impossible.

3. **STOP / HELP handling** — `/api/sms/inbound` verifies the Twilio signature, then:
   - `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`, `ALTO`, `PARAR` → set `sms_opt_in = false`, reply once with the confirmation, and never message that number again.
   - `HELP`, `AYUDA` → reply with the business name, what the messages are, and the phone number.
   - `START`, `UNSTOP`, `SI` → re-subscribe, restamp `sms_opt_in_at`.
   - Anything else → log it and notify the shop. A customer replying to an order text is trying to reach a human.

4. **Quiet hours** from `settings.notifications` (default 21:00–08:00 Richmond time). A reminder due inside quiet hours is held until the window opens. **Transactional "your order is ready" is exempt** — that one is time-critical and expected.

5. Every marketing SMS carries an opt-out reminder. Transactional messages do not need one on every send, but the first message to a number always does.

---

## Templates — written out in full

`{{placeholders}}` are filled server-side. All money via `Intl.NumberFormat`. All times rendered in `America/New_York`.

### 1 · `order-confirmed` — email, on `checkout.session.completed`

**ES — subject:** `Tu pedido está confirmado — {{orderNumber}}`

> **¡Gracias, {{firstName}}!**
>
> Tu pedido está confirmado y lo tendremos listo.
>
> **Recoger:** {{pickupDay}} {{pickupDate}} a las {{pickupTime}}
> **Pedido:** {{orderNumber}}
>
> {{#items}}{{qty}} × {{name}} — {{lineTotal}}{{/items}}
>
> Subtotal {{subtotal}}
> Impuesto {{tax}}
> **Total {{total}}** — pagado
>
> **Dónde:** 7730 Midlothian Turnpike, Ste A, Richmond, VA 23235
> [Cómo llegar]({{directionsUrl}})
>
> ¿Necesitas cambiar algo? [Administra tu pedido aquí]({{magicLink}})
>
> — La familia Ortega
> (804) 986-9695

**EN — subject:** `Your order is confirmed — {{orderNumber}}` — same structure, natural English.

Attach an `.ics` for the pickup time with a 1-hour alarm and the address in `LOCATION`.

### 2 · `cake-confirmed` — email, on cake deposit

**ES — subject:** `Tu pastel está apartado — {{orderNumber}}`

> **{{firstName}}, tu pastel está apartado.**
>
> **Recoger:** {{pickupDay}} {{pickupDate}} a las {{pickupTime}}
>
> **Tu pastel**
> Tamaño: {{sizeLabel}} ({{servings}} porciones)
> Pisos: {{tiers}}
> Sabor: {{flavor}} · Relleno: {{filling}} · Cubierta: {{frosting}}
> Decoración: {{finish}}
> **Escribir en el pastel:** «{{inscription}}»
> Colores: {{colorNotes}}
>
> **Revisa que el texto esté exactamente como lo quieres.** Así lo vamos a escribir.
>
> Total {{total}} · Depósito pagado {{deposit}} · **Saldo al recoger {{balance}}**
>
> **Cancelaciones:** más de 72 horas antes, reembolso completo. Entre 48 y 72 horas, 50%. Menos de 48 horas, sin reembolso.
>
> [Ver o cambiar tu pedido]({{magicLink}})
>
> — La familia Ortega · (804) 986-9695

The inscription is quoted, on its own line, in a larger size. Getting `Felices 15, Sofía` wrong is the single most common custom-cake failure, and the fix is showing it back before the cake is made.

### 3 · `order-ready` — SMS + email, on status → `ready`

**ES SMS (under 160 chars):**
> La Sabrosita: tu pedido {{orderNumber}} está listo. 7730 Midlothian Tpke Ste A. Hasta las {{closingTime}}. Responde STOP para cancelar.

**EN SMS:**
> La Sabrosita: order {{orderNumber}} is ready. 7730 Midlothian Tpke Ste A. Until {{closingTime}}. Reply STOP to opt out.

Email carries the same plus the directions link.

### 4 · `order-reminder` — email 24h out, SMS 3h out

**ES SMS:**
> La Sabrosita: recuerda tu pedido {{orderNumber}} hoy a las {{pickupTime}}. Responde 1 para confirmar o 2 para cancelar.

Replies `1` and `2` are handled by the inbound webhook: `1` stamps a confirmation on the order; `2` moves it to `cancelled`, calls `release_order_stock`, and triggers the refund path per policy.

**Cake orders get an additional 48-hour reminder** with the full spec restated, because that is the last useful moment to correct an inscription.

### 5 · `order-cancelled` — email

States what was cancelled, what was refunded, when the refund lands (5–10 business days), and the phone number. No upsell, no marketing. Someone cancelling is not a moment to sell.

### 6 · `review-request` — email, 24h after `completed`

**ES — subject:** `¿Cómo estuvo tu {{topItem}}?`

> **Gracias por venir, {{firstName}}.**
>
> Si te gustó, una reseña en Google nos ayuda muchísimo. Toma un minuto.
>
> [Dejar una reseña]({{googleReviewUrl}})
>
> Y si algo no estuvo bien, dinos primero a nosotros — contesta este correo o llámanos al (804) 986-9695. Lo arreglamos.

Sent once per customer per 60 days. **The "tell us first" line is not a filter or a gate** — the Google link is right there and comes first. It is there because it is the right thing to say, and because it gives an unhappy customer a path that is faster than a one-star review.

### 7 · `wholesale-welcome` — email on account approval

Account approved, the password-setup magic link (14-day expiry), delivery day, route, cutoff time, minimum order, credit terms, and a two-line "how to place your first order."

### 8 · `wholesale-order-confirmed`, 9 · `wholesale-invoice`, 10 · `standing-order-notice`

- Order confirmed: cases, delivery date, total, cutoff for changes.
- Invoice: number, issue and due dates, line items, total, terms, PDF attached.
- Standing-order notice, sent the evening before materialization: *"Mañana te llevamos tu pedido de siempre: 96 conchas, 48 chicharrones, 12 quesadillas. ¿Cambias algo? Tienes hasta las 6:00 p.m."* with an edit link.

### 11 · `catering-inquiry-received` — email

Confirms receipt, states the response window (one business day), restates what they asked for, and gives the phone number for anything urgent.

### 12 · `win-back` — email, 90 days lapsed, marketing

Only to `email_opt_in = true`. One-click unsubscribe in the header (RFC 8058 `List-Unsubscribe-Post`) and in the body. Warm, short, no discount unless the client provides one.

---

## Cron jobs — `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/reminders",       "schedule": "0 * * * *" },
    { "path": "/api/cron/standing-orders", "schedule": "0 22 * * *" },
    { "path": "/api/cron/abandoned-carts", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/review-requests", "schedule": "0 15 * * *" }
  ]
}
```

Every cron route:
- verifies `Authorization: Bearer ${CRON_SECRET}` and returns 401 otherwise;
- is **idempotent** — a `messages_log` lookup prevents a duplicate send if the job runs twice;
- processes in batches with a time budget, returning `{ processed, skipped, failed }`;
- logs failures without failing the whole run.

`abandoned-carts` cancels `pending_payment` orders older than 30 minutes and calls `release_order_stock` — without it, an abandoned checkout holds the last six tres leches indefinitely.

`standing-orders` runs at 22:00 UTC (18:00 EDT / 17:00 EST) and must respect the double-order guard from PROMPT 13.

---

## Acceptance criteria

- [ ] Every template renders in **both** locales with real data and no `{{placeholder}}` leaking through. Screenshot each.
- [ ] Emails render correctly in Gmail (web + iOS), Apple Mail, and Outlook web. Test with a real send, not a preview tool alone.
- [ ] Accents survive: `Quesadilla Salvadoreña`, `Felices 15, Sofía`, `piñata` — in subject lines too.
- [ ] The `.ics` opens in Google Calendar and Apple Calendar at the correct local time, verified across the DST boundary.
- [ ] Every SMS is under 160 characters in **both** languages. Spanish runs longer — check it, do not assume.
- [ ] `STOP` sets `sms_opt_in = false` and no further SMS is sent to that number. Verify with a real message.
- [ ] `HELP` returns the compliant reply.
- [ ] Quiet hours hold a reminder and release it at 08:00 Richmond time; `order-ready` is correctly exempt.
- [ ] Reply `1` confirms an order; reply `2` cancels it and releases stock.
- [ ] Every send writes exactly one `messages_log` row.
- [ ] Running any cron twice sends nothing twice.
- [ ] A cron without the bearer token returns 401.
- [ ] Abandoned-cart cleanup releases reserved stock — verify `daily_stock.qty_reserved` returns to its prior value.
- [ ] Marketing email carries a working one-click unsubscribe; transactional email does not.
- [ ] The inbound SMS webhook rejects an unsigned request.
- [ ] A2P 10DLC registration status is documented in the handoff before any production SMS.

## What NOT to do

- Do not send an SMS without a stamped, explicit opt-in.
- Do not send marketing to a transactional-only opt-in.
- Do not send a reminder during quiet hours.
- Do not gate a review link behind a satisfaction question. That is review gating, it violates Google's policy, and it is dishonest.
- Do not send anything before the payment webhook confirms.
- Do not machine-translate a template. Write the Spanish first — it is the primary language here.
- Do not put an upsell in a cancellation email.
- Do not let a cron run without an idempotency check.
