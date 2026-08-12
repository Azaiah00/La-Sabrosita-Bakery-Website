import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { db } from '@/lib/data'
import { getDepositPolicy } from '@/lib/cakes'
import { CakeConfigurator } from '@/components/marketing/cake-configurator'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'configurator' })
  return { title: t('title'), description: t('description') }
}

export default async function CakeOrderPage({ params }: { params: Params }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'configurator' })
  const [sizes, options, business, policy] = await Promise.all([
    db.getCakeSizes(),
    db.getCakeOptions(),
    db.getBusiness(),
    getDepositPolicy(),
  ])

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('title')}</h1>
        <p className="page-head__intro">{t('lede')}</p>
      </header>

      <CakeConfigurator
        locale={locale}
        sizes={sizes}
        options={options}
        taxRate={business.taxRate}
        depositPct={policy.cakeDepositPct}
        cancelFullHours={policy.cancelFullRefundHours}
        cancelPartialHours={policy.cancelPartialRefundHours}
        partialPct={policy.partialRefundPct}
      />
    </main>
  )
}
