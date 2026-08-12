import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { getPathname } from '@/i18n/navigation'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Static pathnames only. Dynamic ones (`/menu/[category]`) need params
 * and are enumerated from the data — PROMPT-15 expands this.
 */
type StaticPath = Exclude<keyof typeof routing.pathnames, `${string}[${string}`>

const PATHS = Object.keys(routing.pathnames).filter(
  (p): p is StaticPath => !p.includes('['),
)

/**
 * Both locales, with hreflang alternates on every entry. PROMPT-15
 * hardens this; the structure is here from the start so no page is ever
 * indexed in one language only.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: BASE + getPathname({ locale: routing.defaultLocale, href: path }),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, BASE + getPathname({ locale, href: path })]),
      ),
    },
  }))
}
