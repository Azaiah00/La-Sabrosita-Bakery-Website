import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { db } from '@/lib/data'
import { BUSINESS } from '@/lib/constants'
import { CONFIRM_WITH_CLIENT } from '@/lib/constants'
import { Chamber } from '@/components/marketing/chamber'
import { LineSheet } from '@/components/wholesale/line-sheet'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'wholesale' })
  return { title: t('publicTitle'), description: t('publicDescription') }
}

/**
 * The public wholesale page.
 *
 * There is no page like this anywhere in this market — every reorder is
 * currently a phone call. The line sheet preview shows categories and
 * case sizes and NO PRICES; pricing appears after approval.
 */
export default async function WholesalePage({ params }: { params: Params }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'wholesale' })

  // The default price list, used only for its shape — the preview below
  // renders it with prices suppressed.
  const items = await db.getPriceList('public-preview')

  const storeCount = CONFIRM_WITH_CLIENT(
    'Wholesale store count "250" — from the client\'s own About page and stale; item 13 on the confirmation list',
    '250',
  )

  return (
    <main id="contenido">
      <div className="shell">
        <header className="page-head">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="page-head__title">{t('publicHeading')}</h1>
          <p className="page-head__intro">{t('publicLede', { count: storeCount })}</p>
        </header>
      </div>

      <Chamber tone="wheat">
        <ul className="ws-facts">
          <li>
            <p className="ws-facts__label">{t('fact_territoryLabel')}</p>
            <p className="ws-facts__value">{t('fact_territory')}</p>
          </li>
          <li>
            <p className="ws-facts__label">{t('fact_deliveryLabel')}</p>
            <p className="ws-facts__value">{t('fact_delivery')}</p>
          </li>
          <li>
            <p className="ws-facts__label">{t('fact_orderingLabel')}</p>
            <p className="ws-facts__value">{t('fact_ordering')}</p>
          </li>
        </ul>
      </Chamber>

      <div className="shell">
        <section className="cake-band" aria-labelledby="ls-h">
          <h2 id="ls-h" className="cake-band__heading">
            {t('previewHeading')}
          </h2>
          {/* showPrices={false}. Verified by test and by curl. */}
          <LineSheet items={items} locale={locale} showPrices={false} />
        </section>

        <section className="cake-band" aria-labelledby="apply-h">
          <h2 id="apply-h" className="cake-band__heading">
            {t('applyHeading')}
          </h2>
          <p className="cake-band__body">{t('applyBody')}</p>
          <p className="home-actions">
            <a href={`tel:${BUSINESS.phonePrimary}`} className="btn btn--primary">
              {t('applyCall', { phone: BUSINESS.phonePrimaryDisplay })}
            </a>
            <a href={`mailto:${BUSINESS.email}`} className="btn btn--secondary">
              {t('applyEmail')}
            </a>
          </p>
          {/* The online application form is PROMPT-13 Part A; until it
              exists, the page routes to the two channels that already
              work rather than to a dead end. */}
          <p className="chamber__note">{t('applyNote')}</p>
        </section>
      </div>
    </main>
  )
}
