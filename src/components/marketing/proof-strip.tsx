import { getTranslations } from 'next-intl/server'
import { CountUp } from '@/components/motion/count-up'
import { CONFIRM_WITH_CLIENT } from '@/lib/constants'
import type { Locale } from '@/lib/data/types'

/**
 * DESIGN.md §5, chamber 2 — one row, four items, hairline dividers.
 *
 * Every figure here is sourced. The rating and review count come from the
 * client's Google listing and animate once. Richmond Magazine is their
 * own published mention. The 250+ store figure is from their own About
 * page and is flagged for re-confirmation.
 *
 * PROMPT-03 asks for a "[N] years in business" tile. THERE IS NO SUCH
 * NUMBER: the client's own materials say "over 9 years", "three years
 * ago", and "since the early 90's". CLAUDE.md says omit rather than
 * guess, so that tile carries the family name and the city — both
 * confirmed — and no invented figure.
 */
export async function ProofStrip({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home.proof' })

  const storeCount = CONFIRM_WITH_CLIENT(
    'Wholesale account count "250+" — taken from the client\'s own About page, never independently verified',
    '250+',
  )

  return (
    <ul className="proof">
      <li className="proof__item">
        <p className="proof__value">
          <CountUp value={4.3} decimals={1} locale={locale} />
          <span aria-hidden="true"> ★</span>
        </p>
        <p className="proof__label">
          <CountUp value={663} locale={locale} /> {t('reviewsLabel')}
        </p>
      </li>
      <li className="proof__item">
        <p className="proof__value proof__value--text">{t('featuredValue')}</p>
        <p className="proof__label">{t('featuredLabel')}</p>
      </li>
      <li className="proof__item">
        <p className="proof__value proof__value--text">{t('familyValue')}</p>
        <p className="proof__label">{t('familyLabel')}</p>
      </li>
      <li className="proof__item">
        <p className="proof__value">{storeCount}</p>
        <p className="proof__label">{t('storesLabel')}</p>
      </li>
    </ul>
  )
}
