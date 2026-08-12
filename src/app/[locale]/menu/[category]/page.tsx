import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale, routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { db } from '@/lib/data'
import { getMenu, engineerSections } from '@/lib/menu'
import { menuJsonLd } from '@/lib/schema/menu-jsonld'
import { MenuSection } from '@/components/marketing/menu-section'
import { BUSINESS } from '@/lib/constants'

export const revalidate = 300

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type Params = Promise<{ locale: string; category: string }>

/** Category pages exist for SEO and for deep links. */
export async function generateStaticParams() {
  const categories = await db.getMenu('es')
  return routing.locales.flatMap((locale) =>
    categories.map((c) => ({ locale, category: c.slug })),
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, category } = await params
  if (!isLocale(locale)) return {}
  const found = await db.getCategory(category, locale)
  if (!found) return {}

  return {
    title: found.name,
    alternates: {
      canonical: `${BASE}/${locale}/menu/${category}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${BASE}/${l}/menu/${category}`]),
      ),
    },
  }
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, category } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const all = await getMenu(locale)
  const found = all.find((c) => c.slug === category)
  if (!found) notFound()

  const t = await getTranslations({ locale, namespace: 'menu' })
  const engineering = await engineerSections([found])
  const plan = engineering.get(found.id)

  const jsonLd = menuJsonLd({
    categories: [found],
    locale,
    name: `${found.name} — ${BUSINESS.name}`,
    url: `${BASE}/${locale}/menu/${category}`,
  })

  return (
    <main id="contenido" className="menu-page">
      <div className="shell">
        <header className="page-head">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="page-head__title">{found.name}</h1>
          <p className="page-head__note">
            {t('priceDisclaimer', { phone: BUSINESS.phonePrimaryDisplay })}
          </p>
        </header>

        <div className="menu">
          <MenuSection
            category={found}
            locale={locale}
            order={plan?.order}
            featuredId={plan?.featuredId}
          />
        </div>

        {/* Cross-links to the other five counters. */}
        <nav className="menu-cross" aria-label={t('categoryHeading')}>
          <ul className="menu-cross__list">
            {all
              .filter((c) => c.slug !== category)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={{ pathname: '/menu/[category]', params: { category: c.slug } }}
                    className="menu-cross__link"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <p className="menu-allergen">{t('allergenDisclaimer')}</p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
