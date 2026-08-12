import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { leadDays } from '@/lib/cakes'
import { CONFIRM_WITH_CLIENT } from '@/lib/constants'
import type { Locale } from '@/lib/data/types'

/**
 * Rendered from `cake_sizes`, never hard-coded. Change a row in the admin
 * portal and this table changes.
 *
 * Every figure is prefixed "From"/"Desde" and passes through
 * CONFIRM_WITH_CLIENT — a cake price is a starting point, not a quote,
 * and none of these have been re-confirmed with the bakery.
 */
export async function CakeSizeTable({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'cakes' })
  const sizes = await db.getCakeSizes()

  CONFIRM_WITH_CLIENT('Cake base prices — placeholders until re-quoted', 'placeholder')

  return (
    <div className="ctable">
      <table className="ctable__table">
        <caption className="visually-hidden">{t('sizeTableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('colSize')}</th>
            <th scope="col">{t('colServes')}</th>
            <th scope="col">{t('colFrom')}</th>
            <th scope="col">{t('colNotice')}</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr key={size.id}>
              <th scope="row">{size.label}</th>
              <td className="tabular">
                {size.servingsMin}–{size.servingsMax}
              </td>
              <td className="tabular" data-provisional="true">
                {t('fromPrice', { price: formatMoney(size.basePriceCents, locale) })}
              </td>
              <td className="tabular">
                {t('noticeDays', { days: leadDays(size.minLeadHours) })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ctable__note">{t('priceNote')}</p>
    </div>
  )
}
