import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import type { Messages } from '@/i18n/messages'

type PageKey = keyof Messages['pages']
type Params = Promise<{ locale: string }>

/**
 * A route that exists but has not been built yet.
 *
 * PROMPT-01 creates the full route tree so links, sitemap and locale
 * pathnames are real from day one; PROMPTs 03–16 fill each page in. This
 * renders an honest placeholder rather than inventing copy to fill it.
 */
export function pendingPage(key: PageKey) {
  async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { locale } = await params
    if (!isLocale(locale)) return {}
    const t = await getTranslations({ locale, namespace: 'pages' })
    return { title: t(key) }
  }

  async function Page({ params }: { params: Params }) {
    const { locale } = await params
    if (!isLocale(locale)) notFound()
    setRequestLocale(locale)

    const t = await getTranslations({ locale, namespace: 'pages' })
    const nav = await getTranslations({ locale, namespace: 'nav' })

    return (
      <main id="contenido" className="shell">
        <header className="page-head">
          <h1 className="page-head__title">{t(key)}</h1>
          <p className="page-head__intro">{t('pending')}</p>
        </header>
        <p>
          <Link href="/menu" className="btn btn--secondary">
            {nav('menu')}
          </Link>
        </p>
      </main>
    )
  }

  return { generateMetadata, Page }
}
