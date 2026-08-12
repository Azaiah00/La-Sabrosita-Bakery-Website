import { getTranslations } from 'next-intl/server'
import { ShoppingBag, BookOpen, Phone, MapPin } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { BUSINESS } from '@/lib/constants'
import type { Locale } from '@/lib/data/types'

/** Google Maps directions to the Plus Code, which is exact and stable. */
export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${BUSINESS.street} ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}`,
)}`

/**
 * DESIGN.md §6 — fixed bottom, --surface, 2px ink top border,
 * env(safe-area-inset-bottom) respected. Four equal 48px targets.
 * Present on every public page below md, hidden above.
 */
export async function StickyMobileBar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'sticky' })

  return (
    <nav className="sticky-bar" aria-label={t('order')}>
      <Link href="/pedir" className="sticky-bar__item">
        <ShoppingBag aria-hidden="true" />
        <span>{t('order')}</span>
      </Link>
      <Link href="/menu" className="sticky-bar__item">
        <BookOpen aria-hidden="true" />
        <span>{t('menu')}</span>
      </Link>
      <a href={`tel:${BUSINESS.phonePrimary}`} className="sticky-bar__item">
        <Phone aria-hidden="true" />
        <span>{t('call')}</span>
      </a>
      <a
        href={DIRECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sticky-bar__item"
      >
        <MapPin aria-hidden="true" />
        <span>{t('directions')}</span>
      </a>
    </nav>
  )
}
