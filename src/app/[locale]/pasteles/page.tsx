import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { db } from '@/lib/data'
import { BUSINESS } from '@/lib/constants'
import { leadDays } from '@/lib/cakes'
import { Chamber } from '@/components/marketing/chamber'
import { CakeSizeTable } from '@/components/marketing/cake-size-table'
import { LeadTimeNotice } from '@/components/marketing/lead-time-notice'
import { FaqAccordion, faqJsonLd, type FaqEntry } from '@/components/marketing/faq-accordion'
import { cakeProductJsonLd } from '@/lib/schema/cake-jsonld'
import { LogoDraw } from '@/components/motion/logo-draw'

type Params = Promise<{ locale: string }>
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'cakes' })
  return { title: t('hubTitle'), description: t('hubDescription') }
}

/**
 * The hub stays in the standard chamber rhythm. Only the three sub-pages
 * go fully dark, so the tonal shift into them reads as intentional.
 */
export default async function CakesHubPage({ params }: { params: Params }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'cakes' })
  const [sizes, options] = await Promise.all([db.getCakeSizes(), db.getCakeOptions()])

  const faq: FaqEntry[] = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5', { phone: BUSINESS.phonePrimaryDisplay }) },
    { q: t('faq.q6'), a: t('faq.a6', { phone: BUSINESS.phonePrimaryDisplay }) },
  ]

  const tiered = sizes.find((s) => s.maxTiers >= 2) ?? sizes[sizes.length - 1]
  const sheet = sizes[0]

  const cards = [
    { href: '/pasteles/quinceanera', key: 'quinceanera', size: tiered },
    { href: '/pasteles/bodas', key: 'weddings', size: tiered },
    { href: '/pasteles/cumpleanos', key: 'birthday', size: sheet },
  ] as const

  const groups = ['flavor', 'filling', 'frosting', 'finish'] as const

  return (
    <main id="contenido">
      <div className="shell">
        <header className="page-head">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="page-head__title">{t('hubTitle')}</h1>
          <p className="page-head__intro">{t('hubLede')}</p>
        </header>
      </div>

      <Chamber tone="paper">
        <ul className="cake-hub-grid">
          {cards.map((card) => (
            <li key={card.href}>
              <Link href={card.href} className="cake-card">
                <span className="cake-card__plate" aria-hidden="true">
                  <LogoDraw size={56} />
                </span>
                <span className="cake-card__name">{t(card.key)}</span>
                {card.size && (
                  <span className="cake-card__lead">
                    {t('noticeDays', { days: leadDays(card.size.minLeadHours) })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Chamber>

      <div className="shell">
        <LeadTimeNotice locale={locale} />

        <section aria-labelledby="hub-sizes" className="cake-band">
          <h2 id="hub-sizes" className="cake-band__heading">
            {t('sizeHeading')}
          </h2>
          <CakeSizeTable locale={locale} />
        </section>

        <section aria-labelledby="hub-flavors" className="cake-band">
          <h2 id="hub-flavors" className="cake-band__heading">
            {t('flavorsHeading')}
          </h2>
          <div className="cake-options">
            {groups.map((group) => {
              const inGroup = options.filter((o) => o.optionGroup === group)
              if (!inGroup.length) return null
              return (
                <div key={group} className="cake-options__group">
                  <h3 className="cake-options__heading">{group}</h3>
                  <ul className="cake-options__list">
                    {inGroup.map((o) => (
                      <li key={o.id}>{o.label}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="hub-faq" className="cake-band">
          <h2 id="hub-faq" className="cake-band__heading">
            {t('faqHeading')}
          </h2>
          <FaqAccordion entries={faq} />
        </section>

        <p className="cake-cta">
          <Link href="/pasteles/pedir" className="btn btn--primary">
            {t('cta')}
          </Link>
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            cakeProductJsonLd({
              name: t('hubTitle'),
              description: t('hubDescription'),
              sizes,
              url: `${BASE}/${locale}/pasteles`,
            }),
            faqJsonLd(faq),
          ]),
        }}
      />
    </main>
  )
}
