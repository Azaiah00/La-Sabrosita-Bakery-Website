import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { CakeSubPage } from '@/components/marketing/cake-page'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'cakes' })
  return { title: t('quince.title'), description: t('quince.description') }
}

export default async function QuinceaneraPage({ params }: { params: Params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cakes' })

  return (
    <CakeSubPage
      locale={locale}
      occasion="quinceanera"
      ns="quince"
      // Shot list from docs/ASSET-BRIEF.md. Real cakes only — no stock.
      slots={[
        {
          shot: 'Two-tier quinceañera, wine and gold ribbon',
          alt: 'Two-tier quinceañera cake with wine-colored ribbon and gold detail',
          url: '/images/products/quinceanera-cake.png'
        },
        {
          shot: 'Three-tier quinceañera, piped flowers',
          alt: 'Three-tier quinceañera cake decorated with piped cream flowers',
          url: '/images/products/quinceanera-cake.png'
        },
        {
          shot: 'Detail: hand-piped side work',
          alt: 'Close detail of hand-piped decoration on the side of a quinceañera cake',
          url: '/images/products/quinceanera-cake.png'
        },
      ]}
      extraBlocks={[
        { heading: t('quince.colorHeading'), body: t('quince.colorBody') },
        { heading: t('quince.servingHeading'), body: t('quince.servingBody') },
      ]}
    />
  )
}
