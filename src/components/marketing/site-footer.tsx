import { getTranslations } from 'next-intl/server'
import NextLink from 'next/link'
import { Link } from '@/i18n/navigation'
import { BUSINESS } from '@/lib/constants'
import { HoursTable } from './hours-table'
import { DIRECTIONS_URL } from './sticky-mobile-bar'
import { LogoDraw } from '@/components/motion/logo-draw'
import type { Locale } from '@/lib/data/types'

const EXPLORE = [
  { href: '/menu', key: 'menu' },
  { href: '/pasteles', key: 'cakes' },
  { href: '/mayoreo', key: 'wholesale' },
  { href: '/catering', key: 'catering' },
  { href: '/nuestra-historia', key: 'story' },
  { href: '/faq', key: 'faq' },
] as const

/** Dark chamber. Three columns on desktop, stacked on mobile. */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' })
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const home = await getTranslations({ locale, namespace: 'home.visit' })
  const a11y = await getTranslations({ locale, namespace: 'a11y' })

  return (
    <footer className="site-footer" data-theme="dark">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <div className="site-footer__brand">
            <LogoDraw size={64} />
          </div>
          <h2 className="site-footer__heading">{t('visitHeading')}</h2>
          <address className="site-footer__address">
            {BUSINESS.street} {BUSINESS.unit}
            <br />
            {BUSINESS.city}, {BUSINESS.region} {BUSINESS.postalCode}
          </address>
          <p>
            <a href={`tel:${BUSINESS.phonePrimary}`}>
              {home('phonePrimaryLabel')}: {BUSINESS.phonePrimaryDisplay}
            </a>
          </p>
          <p>
            <a href={`tel:${BUSINESS.phoneSecondary}`}>
              {home('phoneSecondaryLabel')}: {BUSINESS.phoneSecondaryDisplay}
            </a>
          </p>
          <p>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
          <p>
            <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
              {home('directions')}
            </a>
          </p>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">{t('hoursHeading')}</h2>
          <HoursTable locale={locale} />
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">{t('exploreHeading')}</h2>
          <nav aria-label={a11y('footerNav')}>
            <ul className="site-footer__links">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{nav(item.key)}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <h2 className="site-footer__heading site-footer__heading--gap">{t('followHeading')}</h2>
          <ul className="site-footer__links">
            <li>
              <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer">
                {t('facebook')}
              </a>
            </li>
            <li>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer">
                {t('instagram')}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__legal">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        {/*
          The owner's way in. Deliberately small and in the footer — an
          "Admin" item in a bakery's main nav is for the bakery's benefit,
          not the customer's.

          Points at the sign-in rather than at /admin directly: an
          unauthenticated visit to /admin redirects here anyway, and a
          `counter` who follows it lands on the order queue instead of a
          refusal. `next/link`, not the locale-aware one — staff routes
          carry no locale prefix.
        */}
        <p className="site-footer__staff">
          <NextLink href="/portal/entrar">{t('staffLink')}</NextLink>
        </p>
      </div>
    </footer>
  )
}
