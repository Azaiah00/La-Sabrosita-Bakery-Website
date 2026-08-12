import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale, routing } from '@/i18n/routing'
import { getMenu, engineerSections, presentDietaryTags } from '@/lib/menu'
import { menuJsonLd } from '@/lib/schema/menu-jsonld'
import { MenuSection } from '@/components/marketing/menu-section'
import { MenuSearch } from '@/components/marketing/menu-search'
import { MenuCategoryNav } from '@/components/marketing/menu-category-nav'
import { DietaryFilter } from '@/components/marketing/dietary-filter'
import { BUSINESS } from '@/lib/constants'

/** The menu is the highest-value SEO surface in the build. Keep it fresh. */
export const revalidate = 300

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'menu' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${BASE}/${locale}/menu`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${BASE}/${l}/menu`])),
    },
  }
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'menu' })
  const categories = await getMenu(locale)
  const engineering = await engineerSections(categories)
  const tags = presentDietaryTags(categories)

  const jsonLd = menuJsonLd({
    categories,
    locale,
    name: `${t('title')} — ${BUSINESS.name}`,
    url: `${BASE}/${locale}/menu`,
  })

  return (
    <main id="contenido" className="menu-page">
      <div className="shell">
        <header className="page-head">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="page-head__title">{t('heading')}</h1>
          <p className="page-head__intro">{t('intro')}</p>
          {/*
            The client's old site published prices roughly 50% below
            current, and customers arrived expecting to pay half. This
            line is the fix until every price is re-quoted.
          */}
          <p className="page-head__note">
            {t('priceDisclaimer', { phone: BUSINESS.phonePrimaryDisplay })}
          </p>
        </header>
      </div>

      <div className="menu-sticky">
        <div className="shell">
          <MenuCategoryNav
            categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))}
          />
          <MenuSearch />
          <DietaryFilter tags={tags} />
        </div>
      </div>

      <div className="shell">
        <div className="menu">
          {categories.map((category) => {
            const plan = engineering.get(category.id)
            return (
              <MenuSection
                key={category.id}
                category={category}
                locale={locale}
                order={plan?.order}
                featuredId={plan?.featuredId}
              />
            )
          })}
        </div>

        {/* Ships on every menu page from day one, whatever tags exist. */}
        <p className="menu-allergen">{t('allergenDisclaimer')}</p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
