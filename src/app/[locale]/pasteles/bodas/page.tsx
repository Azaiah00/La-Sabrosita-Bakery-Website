import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { CakeSubPage } from '@/components/marketing/cake-page'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'cakes' })
  return { title: t('boda.title'), description: t('boda.description') }
}

export default async function WeddingCakesPage({ params }: { params: Params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cakes' })

  return (
    <CakeSubPage
      locale={locale}
      occasion="boda"
      ns="boda"
      // A wedding is a quote conversation, not an instant charge.
      ctaKey="ctaQuote"
      slots={[
        {
          shot: 'Three-tier wedding cake, white buttercream',
          alt: 'Three-tier wedding cake finished in white buttercream',
          url: '/images/products/wedding-cake.png'
        },
        {
          shot: 'Two-tier wedding cake with fresh flowers',
          alt: 'Two-tier wedding cake decorated with fresh flowers',
          url: '/images/products/wedding-cake.png'
        },
        {
          shot: 'Cake table setup',
          alt: 'A wedding cake set up on its table before the reception',
          url: '/images/products/wedding-cake.png'
        },
      ]}
      extraBlocks={[
        { heading: t('boda.tastingHeading'), body: t('boda.tastingBody') },
        { heading: t('boda.planHeading'), body: t('boda.planBody') },
        { heading: t('boda.deliveryHeading'), body: t('boda.deliveryBody') },
      ]}
    />
  )
}
