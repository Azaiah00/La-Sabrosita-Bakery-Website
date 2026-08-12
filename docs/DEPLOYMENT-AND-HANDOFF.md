# Deployment & Handoff — La Sabrosita Bakery

---

## 1. Accounts to create

| Service | Plan | Purpose | Who owns it |
|---|---|---|---|
| **Vercel** | Pro | Hosting, ISR, cron | Agency, transfer to client on request |
| **Supabase** | Pro | Postgres, Auth, RLS, Realtime, Storage | Client, agency as member |
| **Stripe** | Standard | Deposits, pickup orders, gift cards | **Client — must be in the bakery's legal name and bank account** |
| **Resend** | Pro | Transactional email | Agency |
| **Twilio** | Pay-as-you-go | SMS + A2P 10DLC | Agency, client billing |
| **Google Business Profile** | Free | The single highest-ROI item in this project | **Client** |
| **Google Search Console** | Free | Indexing, queries | Both |
| **Cloudflare** *(optional)* | Free | DNS | Whoever holds the registrar |

**Stripe must be opened by the client, in the business's legal name, with the business's bank account and EIN.** Never onboard a client's payments under an agency account — it is a compliance problem and it makes the relationship impossible to unwind cleanly.

---

## 2. Environment variables

### Vercel — Production

```
NEXT_PUBLIC_SITE_URL=https://www.lasabrositabakery.com
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role — SERVER ONLY>
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…
RESEND_API_KEY=re_…
RESEND_FROM="La Sabrosita Bakery <pedidos@lasabrositabakery.com>"
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_PHONE_NUMBER=+1804…
CRON_SECRET=<64 random hex chars>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…
ALLOW_UNCONFIRMED=false
```

`ALLOW_UNCONFIRMED=true` is permitted **only** on the Preview environment. If it is ever set in Production, unconfirmed facts can ship — which is the exact failure mode this whole system was built to prevent.

Preview uses Stripe **test** keys, a separate Supabase project, and a Twilio test number.

---

## 3. Supabase setup

1. Create the project in **US East (N. Virginia)** — closest region to Richmond and to the Vercel edge.
2. Apply `supabase/migrations/0001_schema.sql`, then `0002_cake_slots.sql`, then any later migrations in order.
3. Add the `auth.users` foreign key that is deliberately omitted from the portable schema:
   ```sql
   alter table staff_members
     add constraint staff_members_user_fk
     foreign key (user_id) references auth.users(id) on delete cascade;
   ```
4. Apply `supabase/seed.sql` on **staging only**. Never on production. The seed contains illustrative demo prices and would be catastrophic if it landed in a live catalogue.
5. **Storage buckets — all private, none public:**
   | Bucket | Contents | Access |
   |---|---|---|
   | `product-images` | Menu and cake photography | Public read via CDN, admin write |
   | `cake-references` | Customer reference photos | **Private.** Signed URL, staff only |
   | `resale-certificates` | Wholesale tax documents | **Private.** Signed URL, manager only |
   | `receipts` | Expense receipt images | **Private.** Signed URL, manager only |
6. Auth: email + password. Disable public sign-ups — staff and wholesale accounts are created by an admin. Set the site URL and redirect allow-list.
7. Enable Point-in-Time Recovery. This database holds the bakery's financial records.
8. Verify RLS: `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;` must return **zero rows**.

---

## 4. Stripe setup

1. Activate the account with the business's EIN and bank account.
2. Business name on statements: `LA SABROSITA BAKERY` — a customer who sees an unfamiliar descriptor files a chargeback.
3. Webhook endpoint: `https://www.lasabrositabakery.com/api/stripe/webhook`, subscribed to `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `payment_intent.payment_failed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Enable Apple Pay and Google Pay — a meaningful share of mobile bakery orders convert on a wallet or not at all.
6. Set the statement descriptor suffix to `CAKE` for deposits so a customer recognizes it months later.
7. Radar: default rules are fine at this volume. Do not add friction.
8. Test the full cycle in test mode — payment, partial refund, full refund — before switching to live keys.

---

## 5. Twilio and A2P 10DLC

**No production SMS may be sent before 10DLC registration completes.** Unregistered A2P traffic gets filtered by the carriers, and the messages simply never arrive.

1. Register the Brand (business legal name, EIN, address).
2. Register the Campaign as **Mixed / Customer Care**, with the sample messages from `PROMPT-14`.
3. Attach the phone number to the campaign.
4. Configure the inbound webhook: `https://www.lasabrositabakery.com/api/sms/inbound`.
5. Verify `STOP` and `HELP` behave correctly against the live number before launch.
6. Expect 1–3 weeks for approval. **Start this on day one of the project**, not at launch.

---

## 6. Domain and DNS

The domain `lasabrositabakery.com` currently points at the iWeb site. Confirm who holds the registrar before touching anything.

1. Point `www` at Vercel (`CNAME → cname.vercel-dns.com`).
2. Apex `A` record → Vercel's IP, or use an ALIAS/ANAME if the DNS provider supports it.
3. Redirect apex → `www` (or the reverse) with a 301, and pick one canonical host.
4. Verify the TLS certificate issues.
5. **Add these four redirects before cutover.** They are the only indexed URLs the current site has, and losing them throws away its only search equity:
   | Old | New |
   |---|---|
   | `/Welcome.html` | `/es` |
   | `/Products/Products.html` | `/es/menu` |
   | `/About_Us.html` | `/es/nuestra-historia` |
   | `/Contact_Us.html` | `/es/visitanos` |
6. Email: keep `LaSabrositaBakery@gmail.com` working. Add `pedidos@lasabrositabakery.com` for sending, with SPF, DKIM and DMARC configured for Resend. A missing DMARC record is why transactional email lands in spam.

---

## 7. Launch sequence

**T-14 days**
- Start A2P 10DLC registration.
- Client confirms every item in §7 of `00-INTEL-AUDIT-PLAN.md`. **Prices and hours are blocking.**
- Photography shoot from `docs/ASSET-BRIEF.md`.
- Claim the Google Business Profile. *(Do this first — it is free and it works immediately.)*

**T-7 days**
- Real content loaded: confirmed prices, confirmed hours, real photos.
- Full QA pass per `PROMPT-16`. Every box, with evidence.
- Stripe live keys, one real $1 transaction, refunded.
- Staff accounts created; 30-minute training on the portal, in Spanish.

**T-1 day**
- Final Lighthouse run against the production deployment.
- Verify every legacy redirect.
- Verify hours match across the site, GBP, Facebook, DoorDash and Grubhub.
- Submit both sitemaps to Search Console and Bing.

**Launch day**
- DNS cutover, morning, not Friday afternoon.
- Watch: Vercel logs, Stripe dashboard, Supabase logs, GA4 realtime.
- Place one real order yourself and pick it up.

**T+1 week**
- Search Console coverage check; fix anything not indexing.
- Review the first orders with the client; adjust pacing and slot capacity from what actually happened.
- Turn on review requests.

---

## 8. Backups and recovery

- Supabase PITR retains 7 days on Pro. Enable it.
- Weekly `pg_dump` to cold storage, retained 90 days.
- Test a restore into a scratch project **before launch**, not after an incident.
- The `audit_log` table is the forensic record for anything financial. Never truncate it.
- Export path: every table has a CSV export in the admin. **The client owns their data and the contract should say so in plain language.**

---

## 9. Monitoring

| Signal | Where | Alert |
|---|---|---|
| Build and runtime errors | Vercel | Any 500 |
| Payment failures | Stripe | Any failed payment intent |
| Email bounces | Resend | Bounce rate > 2% |
| SMS failures | Twilio | Any undelivered |
| Database | Supabase | Connection saturation, slow queries |
| Cron | Vercel | Any non-200 from a cron route |
| Core Web Vitals | Search Console | Any URL falling out of "good" |

Set up an uptime check on `/es` and on `/api/availability`.

---

## 10. Plain-English admin guide — hand this to the client

Write it in **Spanish first**, then English, as a printable PDF, and walk through it in person. Argentina Ortega built this business from a home kitchen; the guide should read like instructions from a person, not a software manual.

Cover, one page each:

1. **Cómo entrar** — the address, your email, your password, what to do if you forget it.
2. **Cómo marcar algo como agotado (86)** — one screen, two taps, and it disappears from the website immediately.
3. **Cómo cambiar un precio** — and the warning that changes go live on the website right away.
4. **Cómo ver los pedidos de hoy** — and how to mark one ready so the customer gets the text.
5. **Cómo cerrar el día** — the daily sales screen, in under two minutes.
6. **Cómo apuntar la merma** — and why it is worth the 20 seconds.
7. **Cómo recibir un pedido de proveedor** — and what the price-change warning means.
8. **Cómo aprobar una cuenta de mayoreo.**
9. **Cómo leer el reporte de ganancias** — what food cost % means, what labor % means, and what numbers are normal.
10. **A quién llamar cuando algo no funciona** — with a real name and a real number.

Record a short screen video of each, in Spanish. People go back to video far more than to a PDF.

---

## 11. Handover checklist

- [ ] All credentials transferred to the client's password manager.
- [ ] Client is the **owner** of: Stripe, Google Business Profile, the domain registrar, Supabase.
- [ ] Agency retains developer-level access only, documented, revocable.
- [ ] Admin guide delivered in Spanish and English, printed and digital.
- [ ] Training session completed and recorded.
- [ ] Support arrangement in writing: response times, what is covered, what is billable.
- [ ] Data-export path demonstrated to the client, in person.
- [ ] Backup restore tested and documented.
- [ ] A "what to do if the site goes down" one-pager, with a phone number.
