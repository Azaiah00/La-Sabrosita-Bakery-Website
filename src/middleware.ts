import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

/**
 * Negotiates the locale from `Accept-Language` on a first visit, then
 * respects the NEXT_LOCALE cookie the header toggle sets. With
 * defaultLocale 'en' and localePrefix 'always', a request with no signal
 * lands on `/en`; a Spanish-speaking browser still gets `/es` on its own,
 * and the toggle overrides both.
 *
 * `/portal` and `/admin` are deliberately outside the locale tree — staff
 * routes carry no locale prefix and read their language from the cookie.
 *
 * NOTE: this file must live in `src/`, not the repo root. With a `src`
 * directory Next only looks for middleware here, and a root copy is
 * silently ignored — `/` 404s instead of redirecting to `/es`.
 */
export default createMiddleware(routing)

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|portal|admin|brand|monitoring|.*\\..*).*)',
  ],
}
