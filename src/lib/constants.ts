import { IS_DEMO } from '@/lib/data/is-demo'

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
 *
 * A demo build is exempt. Demo mode exists to show placeholder data, and
 * IS_DEMO is inlined into the bundle at build time — unlike
 * ALLOW_UNCONFIRMED, which a host only exposes during the build and not
 * when a page is rendered on request. Without this a demo deploy builds
 * fine and then throws on the first request. A real production build has
 * IS_DEMO false, so the guard still bites where it matters.
 */
export function CONFIRM_WITH_CLIENT<T>(label: string, placeholder: T): T {
  if (
    process.env.NODE_ENV === 'production' &&
    !IS_DEMO &&
    process.env.ALLOW_UNCONFIRMED !== 'true'
  ) {
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
