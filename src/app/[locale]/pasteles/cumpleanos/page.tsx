import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { CakeSubPage } from '@/components/marketing/cake-page'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'cakes' })
  return { title: t('cumple.title'), description: t('cumple.description') }
}

export default async function BirthdayCakesPage({ params }: { params: Params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cakes' })

  return (
    <CakeSubPage
      locale={locale}
      occasion="cumpleanos"
      ns="cumple"
      slots={[
        {
          shot: 'Half sheet birthday cake with piped border',
          alt: 'Half sheet birthday cake with a piped cream border and inscription',
          url: '/images/products/birthday-cake.png'
        },
        {
          shot: 'Edible photo cake',
          alt: 'Birthday cake finished with an edible printed photograph',
          url: '/images/products/birthday-cake.png'
        },
      ]}
      extraBlocks={[
        { heading: t('cumple.photoCakeHeading'), body: t('cumple.photoCakeBody') },
      ]}
    />
  )
}
