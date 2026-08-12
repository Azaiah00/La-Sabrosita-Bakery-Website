import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { db } from '@/lib/data'
import { BUSINESS } from '@/lib/constants'
import { CakeSizeTable } from './cake-size-table'
import { LeadTimeNotice } from './lead-time-notice'
import { CakeGallery, type GallerySlot } from './cake-gallery'
import { FaqAccordion, faqJsonLd, type FaqEntry } from './faq-accordion'
import { cakeProductJsonLd, breadcrumbJsonLd } from '@/lib/schema/cake-jsonld'
import type { Occasion } from '@/lib/cakes'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * The shared body of the three cake sub-pages.
 *
 * DESIGN.md / PROMPT-05: these are the ONE place on the site that goes
 * fully dark — `data-theme="dark"` on the whole page, one band per
 * viewport. It is the highest-ticket product and it should feel like it.
 * The hub page stays in the normal chamber rhythm so the shift reads as
 * deliberate rather than accidental.
 */
export async function CakeSubPage({
  locale: rawLocale,
  occasion,
  ns,
  slots,
  extraBlocks,
  ctaKey = 'cta',
}: {
  locale: string
  occasion: Occasion
  ns: 'quince' | 'boda' | 'cumple'
  slots: GallerySlot[]
  extraBlocks: { heading: string; body: string }[]
  ctaKey?: 'cta' | 'ctaQuote'
}) {
  if (!isLocale(rawLocale)) notFound()
  const locale = rawLocale
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'cakes' })
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const sizes = await db.getCakeSizes()

  // Both client-confirmed answers are deliberately NOT answered here.
  const faq: FaqEntry[] = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5', { phone: BUSINESS.phonePrimaryDisplay }) },
    { q: t('faq.q6'), a: t('faq.a6', { phone: BUSINESS.phonePrimaryDisplay }) },
  ]

  const path =
    occasion === 'quinceanera'
      ? '/pasteles/quinceanera'
      : occasion === 'boda'
        ? '/pasteles/bodas'
        : '/pasteles/cumpleanos'

  return (
    <main id="contenido" className="cake-page" data-theme="dark">
      <div className="shell">
        <header className="page-head">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="page-head__title">{t(`${ns}.title`)}</h1>
          <p className="page-head__intro">{t(`${ns}.lede`)}</p>
        </header>

        {/* Terms before any CTA. */}
        <LeadTimeNotice locale={locale} />

        <section aria-labelledby="gallery-h" className="cake-band">
          <h2 id="gallery-h" className="cake-band__heading">
            {t('galleryHeading')}
          </h2>
          <CakeGallery slots={slots} locale={locale} />
        </section>

        {extraBlocks.map((block) => (
          <section key={block.heading} className="cake-band">
            <h2 className="cake-band__heading">{block.heading}</h2>
            <p className="cake-band__body">{block.body}</p>
          </section>
        ))}

        <section aria-labelledby="sizes-h" className="cake-band">
          <h2 id="sizes-h" className="cake-band__heading">
            {t('sizeHeading')}
          </h2>
          <CakeSizeTable locale={locale} />
        </section>

        <section aria-labelledby="faq-h" className="cake-band">
          <h2 id="faq-h" className="cake-band__heading">
            {t('faqHeading')}
          </h2>
          <FaqAccordion entries={faq} />
        </section>

        <p className="cake-cta">
          <Link href="/pasteles/pedir" className="btn btn--primary">
            {t(ctaKey)}
          </Link>
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            cakeProductJsonLd({
              name: t(`${ns}.title`),
              description: t(`${ns}.description`),
              sizes,
              url: `${BASE}/${locale}${path}`,
            }),
            faqJsonLd(faq),
            breadcrumbJsonLd({
              locale,
              base: BASE,
              trail: [
                { name: nav('home'), path: '' },
                { name: nav('cakes'), path: '/pasteles' },
                { name: t(`${ns}.title`), path },
              ],
            }),
          ]),
        }}
      />
    </main>
  )
}
