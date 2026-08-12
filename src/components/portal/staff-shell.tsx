import { EB_Garamond, Figtree } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { IS_DEMO } from '@/lib/data'
import { DemoBanner } from '@/lib/demo/banner'
import type { Locale } from '@/lib/data/types'
import '@/app/globals.css'

/** Same variable-font setup as the public layout — see the note there. */
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

/**
 * The document shell for /portal and /admin.
 *
 * Staff routes carry no locale prefix — the owner works in Spanish and
 * the language comes from the NEXT_LOCALE cookie. The demo banner is
 * here too: PROMPT-00 Part E says every route, and the portal and admin
 * are where the sales figures live, so it matters most here.
 */
export async function StaffShell({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
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
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
