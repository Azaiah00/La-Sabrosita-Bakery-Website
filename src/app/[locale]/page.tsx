import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { db } from '@/lib/data'
import { BUSINESS } from '@/lib/constants'
import { Chamber } from '@/components/marketing/chamber'
import { ProofStrip } from '@/components/marketing/proof-strip'
import { ProductCard } from '@/components/marketing/product-card'
import { MenuPreview } from '@/components/marketing/menu-preview'
import { HoursTable } from '@/components/marketing/hours-table'
import { OpenStatus } from '@/components/marketing/open-status'
import { AnnouncementBar } from '@/components/marketing/announcement-bar'
import { ReviewQuote, APPROVED_REVIEWS } from '@/components/marketing/review-quote'
import { DIRECTIONS_URL } from '@/components/marketing/sticky-mobile-bar'
import { Reveal } from '@/components/motion/reveal'
import { LogoDraw } from '@/components/motion/logo-draw'

/** The six hero slugs from PROMPT-03 chamber 3. */
const HERO_SLUGS = [
  'tres-leches',
  'quesadilla-salvadorena',
  'concha',
  'flan',
  'chicharron-guayaba',
  'dona',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })
  return { title: { absolute: t('title') }, description: t('description') }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'home' })
  const menuT = await getTranslations({ locale, namespace: 'menu' })

  const [categories, announcement, cakeSizes] = await Promise.all([
    db.getMenu(locale),
    db.getAnnouncement(locale),
    db.getCakeSizes(),
  ])

  const allProducts = categories.flatMap((c) => c.products)
  const heroProducts = HERO_SLUGS.map((slug) => allProducts.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  )

  // Lead times come from the data, never from JSX.
  const leadDays = (hours: number) => Math.ceil(hours / 24)
  const tierCake = cakeSizes.find((s) => s.maxTiers >= 2) ?? cakeSizes[cakeSizes.length - 1]
  const sheetCake = cakeSizes[0]

  return (
    <>
      {announcement && <AnnouncementBar body={announcement.body} href={announcement.linkUrl} />}

      <main id="contenido">
        {/* 1 · HERO — dark ------------------------------------------------ */}
        <Chamber tone="dark" className="hero" labelledBy="hero-h1">
          <p className="eyebrow hero__eyebrow">{t('hero.eyebrow')}</p>
          {/*
            LCP element. Server-rendered and visible before any JavaScript
            runs — DESIGN.md §7 forbids motion-library work on the main
            thread before it paints, so nothing enhances this headline.
          */}
          <h1 id="hero-h1" className="hero__title">
            {t('hero.heading')}
          </h1>
          <p className="hero__sub">{t('hero.sub')}</p>

          <div className="hero__actions">
            <Link href="/pasteles/pedir" className="btn btn--primary">
              {t('hero.ctaPrimary')}
            </Link>
            <Link href="/menu" className="btn btn--secondary">
              {t('hero.ctaSecondary')}
            </Link>
          </div>

          {/* No scrolling required: open state and street, above the fold. */}
          <p className="hero__meta">
            <OpenStatus locale={locale} />
            <span aria-hidden="true"> · </span>
            {BUSINESS.street}
          </p>
        </Chamber>

        {/* 2 · PROOF — paper ---------------------------------------------- */}
        <Chamber tone="paper" className="proof-chamber">
          <h2 className="visually-hidden">{t('proof.heading')}</h2>
          <ProofStrip locale={locale} />
        </Chamber>

        {/* 3 · THE CASE — dark -------------------------------------------- */}
        <Chamber tone="dark" labelledBy="case-h2">
          <p className="eyebrow">{t('case.intro')}</p>
          <h2 id="case-h2" className="chamber__title">
            {t('case.heading')}
          </h2>
          <Reveal variant="plate" className="pcard-grid">
            {heroProducts.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </Reveal>
          <p className="chamber__cta">
            <Link href="/menu" className="btn btn--secondary">
              {t('case.cta')}
            </Link>
          </p>
        </Chamber>

        {/* 4 · STORY — paper ---------------------------------------------- */}
        <Chamber tone="paper" labelledBy="story-h2">
          <div className="story">
            <div className="story__media">
              <img
                src="/images/family.png"
                alt={t('story.photoAlt')}
                className="story__img"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }}
              />
            </div>
            <div className="story__body">
              <p className="eyebrow">{t('story.eyebrow')}</p>
              <h2 id="story-h2" className="chamber__title">
                {t('story.heading')}
              </h2>
              <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: 'var(--space-4)' }}>
                <li>Argentina Ortega</li>
                <li>Jorge Dawson</li>
                <li>Eduardo Dawson</li>
                <li>Mario Dawson</li>
              </ul>
              <p>
                <Link href="/nuestra-historia" className="btn btn--ghost">
                  {t('story.cta')}
                </Link>
              </p>
            </div>
          </div>
        </Chamber>

        {/* 5 · MENU ENTRY — paper ----------------------------------------- */}
        <Chamber tone="paper-alt" labelledBy="menu-h2">
          <p className="eyebrow">{t('menuPreview.eyebrow')}</p>
          <h2 id="menu-h2" className="chamber__title">
            {t('menuPreview.heading')}
          </h2>
          <MenuPreview
            categories={categories}
            locale={locale}
            soldOutLabel={menuT('soldOut')}
          />
          <p className="chamber__cta">
            <Link href="/menu" className="btn btn--primary">
              {t('menuPreview.cta')}
            </Link>
          </p>
        </Chamber>

        {/* 6 · CAKES — dark ----------------------------------------------- */}
        <Chamber tone="dark" labelledBy="cakes-h2">
          <p className="eyebrow">{t('cakes.eyebrow')}</p>
          <h2 id="cakes-h2" className="chamber__title">
            {t('cakes.heading')}
          </h2>
          <Reveal variant="plate" className="cake-grid">
            {(
              [
                { href: '/pasteles/quinceanera', key: 'quinceanera', size: tierCake },
                { href: '/pasteles/bodas', key: 'weddings', size: tierCake },
                { href: '/pasteles/cumpleanos', key: 'birthday', size: sheetCake },
              ] as const
            ).map((card) => (
              <Link key={card.href} href={card.href} className="cake-card">
                <span className="cake-card__plate" aria-hidden="true">
                  <LogoDraw size={56} />
                </span>
                <span className="cake-card__name">{t(`cakes.${card.key}`)}</span>
                {card.size && (
                  <span className="cake-card__lead">
                    {t('cakes.leadTime', { days: leadDays(card.size.minLeadHours) })}
                  </span>
                )}
              </Link>
            ))}
          </Reveal>
          <p className="chamber__cta">
            <Link href="/pasteles/pedir" className="btn btn--primary">
              {t('cakes.cta')}
            </Link>
          </p>
        </Chamber>

        {/* 7 · WHOLESALE — wheat ------------------------------------------ */}
        <Chamber tone="wheat" labelledBy="wholesale-h2">
          <div className="wholesale">
            <div>
              <p className="eyebrow">{t('wholesale.eyebrow')}</p>
              <h2 id="wholesale-h2" className="chamber__title">
                {t('wholesale.heading')}
              </h2>
              <p className="wholesale__body">{t('wholesale.body')}</p>
            </div>
            <p>
              <Link href="/mayoreo" className="btn btn--secondary">
                {t('wholesale.cta')}
              </Link>
            </p>
          </div>
        </Chamber>

        {/* 8 · REVIEWS — paper -------------------------------------------- */}
        <Chamber tone="paper" labelledBy="reviews-h2">
          <p className="eyebrow">{t('reviews.eyebrow')}</p>
          <h2 id="reviews-h2" className="chamber__title">
            {t('reviews.heading')}
          </h2>
          <Reveal className="review-grid">
            {APPROVED_REVIEWS.map((r) => (
              <ReviewQuote key={r.quote} review={r} locale={locale} />
            ))}
          </Reveal>
          <p className="chamber__note">{t('reviews.note')}</p>
        </Chamber>

        {/* 9 · VISIT — paper ---------------------------------------------- */}
        <Chamber tone="paper-alt" labelledBy="visit-h2">
          <p className="eyebrow">{t('visit.eyebrow')}</p>
          <h2 id="visit-h2" className="chamber__title">
            {t('visit.heading')}
          </h2>
          <div className="visit">
            <div className="visit__col">
              <h3 className="visit__heading">{t('visit.addressLabel')}</h3>
              <address className="visit__address">
                {BUSINESS.street} {BUSINESS.unit}
                <br />
                {BUSINESS.city}, {BUSINESS.region} {BUSINESS.postalCode}
              </address>
              <p>
                <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  {t('visit.directions')}
                </a>
              </p>

              <h3 className="visit__heading">{t('visit.phoneLabel')}</h3>
              <p>
                <a href={`tel:${BUSINESS.phonePrimary}`}>
                  {t('visit.phonePrimaryLabel')}: {BUSINESS.phonePrimaryDisplay}
                </a>
                <br />
                <a href={`tel:${BUSINESS.phoneSecondary}`}>
                  {t('visit.phoneSecondaryLabel')}: {BUSINESS.phoneSecondaryDisplay}
                </a>
              </p>

              <h3 className="visit__heading">{t('visit.parkingHeading')}</h3>
              <p className="visit__parking">{t('visit.parkingBody')}</p>
            </div>
            <div className="visit__col">
              <HoursTable locale={locale} />
            </div>
          </div>
        </Chamber>

        {/* 10 · ORDER BAND — dark ----------------------------------------- */}
        <Chamber tone="dark" labelledBy="order-h2">
          <div className="orderband">
            <h2 id="order-h2" className="orderband__title">
              {t('order.heading')}
            </h2>
            <p className="orderband__actions">
              <Link href="/pasteles/pedir" className="btn btn--primary">
                {t('order.cta')}
              </Link>
              <a href={`tel:${BUSINESS.phonePrimary}`} className="orderband__phone">
                {t('order.orCall', { phone: BUSINESS.phonePrimaryDisplay })}
              </a>
            </p>
          </div>
        </Chamber>
      </main>
    </>
  )
}
