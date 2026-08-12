import { defineRouting } from 'next-intl/routing'

/**
 * English is the default locale, by explicit client direction.
 *
 * NOTE — this deliberately overrides CLAUDE.md ("Spanish is the default
 * locale. `/` redirects to `/es`. Never write English-first UI"). That
 * rule exists because this is a Salvadoran-founded panadería serving a
 * Spanish-speaking customer base and wholesaling to Hispanic grocery
 * stores, so revisit it before launch if the audience turns out to be
 * the counter rather than the boardroom. Reverting is this one line plus
 * the `defaultLocale` in the middleware matcher comment.
 *
 * What has NOT changed, and should not:
 *   - Both catalogues are fully authored. Spanish is not a machine
 *     translation of the English.
 *   - Layout is still sized to the Spanish string, which runs 15-20%
 *     longer. If it fits Spanish it fits English; the reverse is false.
 *   - Product names stay Spanish. A concha is a concha.
 */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'en',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/menu': { es: '/menu', en: '/menu' },
    // Category slugs are Spanish in both trees — they are the counters'
    // real names and they are what people search for.
    '/menu/[category]': { es: '/menu/[category]', en: '/menu/[category]' },
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

export type Locale = (typeof routing.locales)[number]
export type AppPathname = keyof typeof routing.pathnames

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value)
}
