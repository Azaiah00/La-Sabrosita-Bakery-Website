import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { Chamber } from '@/components/marketing/chamber'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'pages' })
  return { title: t('story') }
}

export default async function OurStoryPage({ params }: { params: Params }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'ourStory' })

  return (
    <main id="contenido">
      <div className="shell">
        <header className="page-head">
          <h1 className="page-head__title">{t('title')}</h1>
        </header>
      </div>

      <Chamber tone="paper">
        <div className="story-page">
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
          <p>{t('p3')}</p>
          <p>{t('p4')}</p>
          <p>{t('p5')}</p>
          <p>{t('p6')}</p>
          <p>{t('p7')}</p>
          <p>{t('p8')}</p>
          <p>{t('p9')}</p>
          <p>{t('p10')}</p>
        </div>
      </Chamber>
    </main>
  )
}
