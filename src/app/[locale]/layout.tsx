import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { EB_Garamond, Figtree } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, isLocale } from '@/i18n/routing'
import { IS_DEMO } from '@/lib/data'
import { DemoBanner } from '@/lib/demo/banner'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { StickyMobileBar } from '@/components/marketing/sticky-mobile-bar'
import { ScrollProvider } from '@/components/motion/scroll-provider'
import '../globals.css'

/**
 * `latin-ext` is MANDATORY — Quesadilla Salvadoreña, Piñata, Quinceañera
 * and Budín all need it.
 *
 * Both families are loaded as variable fonts rather than as a list of
 * static instances. Google no longer serves static EB Garamond files, and
 * the variable axis covers every weight DESIGN.md §3 asks for (display
 * 400/500/600 with italics, UI 400/500/600/700) in two files instead of
 * eleven — which is also what keeps us inside the font budget in §10.
 */
const ebGaramond = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-figtree',
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'site' })
  return {
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('tagline'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages({ locale })
  const t = await getTranslations({ locale, namespace: 'a11y' })

  return (
    <html lang={locale} className={`${ebGaramond.variable} ${figtree.variable}`}>
      <body className={IS_DEMO ? 'has-demo-banner' : undefined}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DemoBanner locale={locale} />
          <a className="skip-link" href="#contenido">
            {t('skipToContent')}
          </a>
          <SiteHeader locale={locale} />
          {children}
          <SiteFooter locale={locale} />
          <StickyMobileBar locale={locale} />
          {/* Lenis + ScrollTrigger, dynamically imported after paint. */}
          <ScrollProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
