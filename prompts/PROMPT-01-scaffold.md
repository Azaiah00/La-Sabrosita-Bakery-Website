# PROMPT 01 — Project scaffold

> Paste this into Cursor / Claude Code first. Nothing else runs until this is done.

---

You are building the website and operations system for **La Sabrosita Bakery**, a Salvadoran-founded Latin bakery (panadería) at 7730 Midlothian Turnpike Ste A, Richmond, VA 23235.

**Read `DESIGN.md` at the repo root before you write a single line of CSS. It is the styling source of truth. Do not use default Tailwind or shadcn colors anywhere.**

## Goal

Scaffold a Next.js 15 App Router project with TypeScript, Tailwind v4, shadcn/ui, bilingual routing, and the full brand theme wired to the tokens in `DESIGN.md`. At the end of this prompt the app builds, lints clean, serves `/es` and `/en`, and renders a page in the correct fonts and colors.

## Stack — install exactly this

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Then:

```bash
npm i next-intl@^3.26 @supabase/supabase-js@^2.48 @supabase/ssr@^0.5 \
      zod@^3.24 react-hook-form@^7.54 @hookform/resolvers@^3.10 \
      @tanstack/react-query@^5.64 motion@^11.15 gsap@^3.12 lenis@^1.1 \
      stripe@^17.5 @stripe/stripe-js@^5.5 resend@^4.1 twilio@^5.4 \
      date-fns@^4.1 date-fns-tz@^3.2 recharts@^2.15 lucide-react@^0.469 \
      class-variance-authority clsx tailwind-merge

npm i -D @types/node vitest@^2.1 @vitejs/plugin-react happy-dom \
      @playwright/test@^1.49 eslint-plugin-jsx-a11y

npx shadcn@latest init
npx shadcn@latest add button input label textarea select checkbox radio-group \
      dialog sheet tabs card badge table form calendar popover separator \
      dropdown-menu toast skeleton alert accordion
```

**Playwright note:** this environment already has Chromium at `/opt/pw-browsers`. Do **not** run `playwright install`.

## Folder structure — create exactly this

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx                    # Home
      menu/
        page.tsx
        [category]/page.tsx
      pasteles/                   # Cakes (ES canonical slug)
        page.tsx
        quinceanera/page.tsx
        bodas/page.tsx
        cumpleanos/page.tsx
        pedir/page.tsx            # Cake configurator
      pedir/page.tsx              # Everyday pickup ordering
      mayoreo/page.tsx            # Wholesale
      catering/page.tsx
      nuestra-historia/page.tsx
      visitanos/page.tsx
      tarjetas-regalo/page.tsx
      empleos/page.tsx
      faq/page.tsx
      pedido/[token]/page.tsx     # Magic-link order status
      not-found.tsx
      error.tsx
    portal/                       # Staff — authenticated, no locale prefix in path
      layout.tsx
      produccion/page.tsx
      pedidos/page.tsx
      merma/page.tsx
    admin/                        # Owner — authenticated
      layout.tsx
      page.tsx                    # Dashboard
      inventario/page.tsx
      recetas/page.tsx
      costos/page.tsx
      proveedores/page.tsx
      compras/page.tsx
      ventas/page.tsx
      gastos/page.tsx
      reportes/page.tsx
      mayoreo/page.tsx
      menu/page.tsx
      ajustes/page.tsx
    api/
      stripe/webhook/route.ts
      cron/
        reminders/route.ts
        standing-orders/route.ts
    globals.css
    sitemap.ts
    robots.ts
  components/
    ui/                           # shadcn primitives, re-tokenized
    marketing/
    portal/
    motion/
  lib/
    supabase/{client,server,middleware}.ts
    stripe.ts
    email.ts
    sms.ts
    money.ts
    datetime.ts
    schema/                       # zod schemas
    constants.ts
  i18n/
    routing.ts
    request.ts
  messages/
    es.json
    en.json
  styles/
    tokens.css
middleware.ts
```

## `src/styles/tokens.css` — copy verbatim from DESIGN.md §2

Paste the full `:root` and `[data-theme="dark"]` blocks from `DESIGN.md` section 2, plus the space/radius/shadow tokens from section 4 and the type-scale tokens from section 3.1. Do not paraphrase them and do not "improve" a value.

## `src/app/globals.css`

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme inline {
  --color-bg: var(--bg);
  --color-bg-alt: var(--bg-alt);
  --color-surface: var(--surface);
  --color-surface-sunk: var(--surface-sunk);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-accent-strong: var(--accent-strong);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-wheat: var(--wheat);
  --color-wheat-soft: var(--wheat-soft);
  --color-success: var(--success);
  --color-warn: var(--warn);
  --color-danger: var(--danger);
  --color-info: var(--info);
  --font-display: var(--font-eb-garamond), Georgia, serif;
  --font-ui: var(--font-figtree), system-ui, sans-serif;
  --radius-sm: 8px;
  --radius: 14px;
  --radius-lg: 28px;
  --radius-xl: 48px;
  --radius-2xl: 80px;
}

html { color-scheme: light; }
html[data-theme="dark"] { color-scheme: dark; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 1.0625rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, .display { font-family: var(--font-display); font-weight: 400; }

:focus-visible {
  outline: 3px solid var(--accent-strong);
  outline-offset: 2px;
}

.tabular { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Fonts — `src/app/[locale]/layout.tsx`

```ts
import { EB_Garamond, Figtree } from 'next/font/google'

const ebGaramond = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
})
```

`latin-ext` is **mandatory** — *Quesadilla Salvadoreña*, *Piñata*, *Budín* and *Quinceañera* need it. Apply both variables to `<html>`.

## Bilingual routing — `next-intl`

`src/i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/menu': { es: '/menu', en: '/menu' },
    '/pasteles': { es: '/pasteles', en: '/cakes' },
    '/pasteles/quinceanera': { es: '/pasteles/quinceanera', en: '/cakes/quinceanera' },
    '/pasteles/bodas': { es: '/pasteles/bodas', en: '/cakes/weddings' },
    '/pasteles/cumpleanos': { es: '/pasteles/cumpleanos', en: '/cakes/birthday' },
    '/pasteles/pedir': { es: '/pasteles/pedir', en: '/cakes/order' },
    '/pedir': { es: '/pedir', en: '/order' },
    '/mayoreo': { es: '/mayoreo', en: '/wholesale' },
    '/catering': { es: '/catering', en: '/catering' },
    '/nuestra-historia': { es: '/nuestra-historia', en: '/our-story' },
    '/visitanos': { es: '/visitanos', en: '/visit' },
    '/tarjetas-regalo': { es: '/tarjetas-regalo', en: '/gift-cards' },
    '/empleos': { es: '/empleos', en: '/careers' },
    '/faq': { es: '/faq', en: '/faq' },
  },
})
```

**Spanish is the default locale.** This is a Salvadoran-founded panadería serving a Spanish-speaking customer base and wholesaling to Hispanic grocery stores. `/` redirects to `/es`. `middleware.ts` negotiates from `Accept-Language` on first visit and then respects an explicit cookie set by the header toggle.

## `src/lib/constants.ts`

```ts
export const BUSINESS = {
  name: 'La Sabrosita Bakery',
  street: '7730 Midlothian Turnpike',
  unit: 'Ste A',
  city: 'Richmond',
  region: 'VA',
  postalCode: '23235',
  country: 'US',
  lat: 37.4989876,
  lng: -77.5400652,
  plusCode: 'FFX5+HX Richmond, Virginia',
  // CONFIRM WITH CLIENT: two numbers are published everywhere. This is the placeholder primary.
  phonePrimary: '+18049869695',
  phonePrimaryDisplay: '(804) 986-9695',
  phoneSecondary: '+18045628937',
  phoneSecondaryDisplay: '(804) 562-8937',
  email: 'LaSabrositaBakery@gmail.com',
  timezone: 'America/New_York',
  facebook: 'https://www.facebook.com/p/La-Sabrosita-Bakery-100063568330828/',
  instagram: 'https://www.instagram.com/lasabrositabakery/',
} as const

/**
 * Anything not yet confirmed by the client renders through this helper.
 * In dev it is visibly flagged. In production it throws at build time,
 * so an unconfirmed fact can never ship.
 */
export function CONFIRM_WITH_CLIENT<T>(label: string, placeholder: T): T {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNCONFIRMED !== 'true') {
    throw new Error(
      `Unconfirmed client fact reached a production build: "${label}". ` +
      `Confirm it and replace the placeholder, or set ALLOW_UNCONFIRMED=true for a staging build.`
    )
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[CONFIRM WITH CLIENT] ${label} = ${String(placeholder)}`)
  }
  return placeholder
}
```

## `src/lib/money.ts`

```ts
/** Money is integer cents in memory and numeric(12,2) in Postgres. Never a float. */
export const toCents = (dollars: number) => Math.round(dollars * 100)
export const fromCents = (cents: number) => cents / 100

export function formatMoney(cents: number, locale: 'es' | 'en') {
  return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    style: 'currency', currency: 'USD',
  }).format(cents / 100)
}
```

## `src/lib/datetime.ts`

```ts
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { BUSINESS } from './constants'

export const TZ = BUSINESS.timezone

/** A wall-clock date+time in Richmond -> the correct UTC instant, DST-aware. */
export function localToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}`, TZ)
}

/** The business date a UTC instant falls on, in Richmond. */
export function businessDate(instant: Date): string {
  return formatInTimeZone(instant, TZ, 'yyyy-MM-dd')
}

export function formatLocal(instant: Date, pattern: string) {
  return formatInTimeZone(instant, TZ, pattern)
}
export { toZonedTime }
```

**Never construct a pickup time with `new Date('2026-11-01T10:00')`.** Always go through `localToUtc`. A 10:00 AM pickup on the day the clocks change must still be 10:00 AM.

## `.env.local.example`

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
RESEND_FROM="La Sabrosita Bakery <pedidos@lasabrositabakery.com>"
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
CRON_SECRET=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
ALLOW_UNCONFIRMED=false
```

## `next.config.ts`

Enable `images.formats: ['image/avif','image/webp']`, add the Supabase storage hostname to `images.remotePatterns`, set `poweredByHeader: false`, and add security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a `Strict-Transport-Security` header with a two-year max-age.

## Acceptance criteria

- [ ] `npm run build` succeeds with zero TypeScript errors and zero ESLint errors.
- [ ] `/` redirects to `/es`. `/en` renders. The language toggle switches routes and persists in a cookie.
- [ ] A test page renders EB Garamond headlines and Figtree body copy — verified in DevTools, not assumed.
- [ ] `document.documentElement.lang` matches the active locale.
- [ ] Toggling `data-theme="dark"` on `<html>` flips every color via tokens, with no hard-coded hex anywhere in `src/`.
- [ ] `grep -rE "#(?!FDFBF6|F6EFE2|FFFFFF|F1E7D6|191918|6B6157|E4D8C4|A88F62|D16639|B85328|9E4420|F7E3D6|E2AA67|F3E0C4|3F6B43|C98A16|A83232|3F6F86|16130F|1F1A15|241E18|120F0C|F7F1E6|B7A996|382E24|7A6850|E8794A|F08E62|33211A|3A2C1C|6FA873|E0AC46|D96B6B|7FA9BF)[0-9A-Fa-f]{6}" src/` returns nothing outside `tokens.css`.
- [ ] `CONFIRM_WITH_CLIENT` throws in a production build.
- [ ] Lighthouse on the placeholder home page: ≥ 95 on all four categories, mobile.

## What NOT to do

- Do **not** run `playwright install`.
- Do **not** add a UI library beyond shadcn/ui + Radix.
- Do **not** import GSAP or Lenis in this prompt — motion arrives in PROMPT 03.
- Do **not** use `next-i18next`, `react-i18next`, or a client-side translation hook. `next-intl` with real routed locales only.
- Do **not** put English first anywhere. Spanish is the default.
- Do **not** invent copy, prices, hours, or product names. Everything comes from the prompts that follow.
