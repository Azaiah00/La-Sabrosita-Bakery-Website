import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import { db } from '@/lib/data'
import type { CommissionSavedRow, Locale } from '@/lib/data/types'

/**
 * The number that renews the retainer every year.
 *
 * It also has to be honest, or it is worth nothing: the assumed
 * marketplace rate is stated ON the card, sourced from
 * `settings.marketplace_rates`, and the copy says "estimated" and tells
 * the owner to check it against their own merchant statement. A savings
 * figure the owner cannot verify is a liability, not a selling point.
 */
export async function CommissionSavedCard({
  rows,
  locale,
}: {
  rows: CommissionSavedRow[]
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'admin' })
  const rates = (await db.getSettings('marketplace_rates')) as {
    doordash_delivery_pct?: number
    stripe_pct?: number
  } | null

  const latest = rows[rows.length - 1]
  if (!latest) return null

  const annual = rows.reduce((sum, r) => sum + r.savedCents, 0)

  return (
    <section className="saved" aria-labelledby="saved-h">
      <p className="eyebrow">{t('commission.eyebrow')}</p>
      <h3 id="saved-h" className="saved__headline">
        {t('commission.headline', {
          amount: formatMoney(Math.max(0, latest.savedCents), locale),
        })}
      </h3>

      <p className="saved__body">
        {t('commission.body', {
          direct: formatMoney(latest.marketplaceSalesCents, locale),
          wouldHavePaid: formatMoney(latest.marketplaceFeesCents, locale),
          actuallyPaid: formatMoney(latest.ownChannelFeesCents, locale),
        })}
      </p>

      <dl className="saved__annual">
        <dt>{t('commission.annualLabel')}</dt>
        <dd className="tabular">{formatMoney(Math.max(0, annual), locale)}</dd>
      </dl>

      {/* State the assumption, on the card, every time. */}
      <p className="saved__note">
        {t('commission.assumption', {
          marketplacePct: rates?.doordash_delivery_pct ?? 25,
          stripePct: rates?.stripe_pct ?? 2.9,
        })}
      </p>
    </section>
  )
}
