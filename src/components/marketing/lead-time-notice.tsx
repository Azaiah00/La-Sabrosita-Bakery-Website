import { getTranslations } from 'next-intl/server'
import { getLeadTimeFacts, getDepositPolicy } from '@/lib/cakes'
import type { Locale } from '@/lib/data/types'

/**
 * The binding lead-time rules and the deposit policy, in plain language,
 * read from `lead_time_rules`, `cake_options` and
 * `settings.deposit_policy`.
 *
 * The deposit terms sit here, above every CTA on the page, because a
 * customer should know what they are committing to before they commit.
 */
export async function LeadTimeNotice({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'cakes' })
  const facts = await getLeadTimeFacts()
  const policy = await getDepositPolicy()

  return (
    <aside className="lead-notice" aria-labelledby="lead-notice-h">
      <h3 id="lead-notice-h" className="lead-notice__heading">
        {t('leadHeading')}
      </h3>
      <ul className="lead-notice__list">
        <li>{t('leadBase', { days: facts.baseDays })}</li>
        {facts.tieredDays && <li>{t('leadTiered', { days: facts.tieredDays })}</li>}
        {facts.largeOrderDays && <li>{t('leadLarge', { days: facts.largeOrderDays })}</li>}
        {facts.extras.map((extra) => (
          <li key={extra.label}>
            {t('leadExtra', { option: extra.label, days: extra.extraDays })}
          </li>
        ))}
      </ul>

      <h3 className="lead-notice__heading">{t('depositHeading')}</h3>
      <p className="lead-notice__deposit">
        {t('depositBody', {
          pct: policy.cakeDepositPct,
          fullHours: policy.cancelFullRefundHours,
          partialHours: policy.cancelPartialRefundHours,
          partialPct: policy.partialRefundPct,
        })}
      </p>
    </aside>
  )
}
