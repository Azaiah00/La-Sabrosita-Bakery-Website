import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale, PriceListItem } from '@/lib/data/types'

/**
 * The line sheet.
 *
 * ORDERED IN CASES, never in units — that is how the buyer thinks, how
 * the van is loaded, and how the minimum is expressed.
 *
 * `showPrices` is the single most important prop in this file. On the
 * public page it is FALSE: wholesale pricing is never shown to an
 * unauthenticated visitor. One grocery store seeing another's pricing
 * would end the relationship, and a retail customer seeing wholesale
 * pricing would end the margin.
 */
export async function LineSheet({
  items,
  locale,
  showPrices,
}: {
  items: PriceListItem[]
  locale: Locale
  showPrices: boolean
}) {
  const t = await getTranslations({ locale, namespace: 'wholesale' })

  return (
    <div className="mtable">
      <table className="mtable__table">
        <caption className="visually-hidden">
          {showPrices ? t('lineSheetCaption') : t('lineSheetPreviewCaption')}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t('col_product')}</th>
            <th scope="col">{t('col_caseQty')}</th>
            <th scope="col">{t('col_minCases')}</th>
            {showPrices && <th scope="col">{t('col_unitPrice')}</th>}
            {showPrices && <th scope="col">{t('col_casePrice')}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.variantId}>
              <th scope="row">{item.name}</th>
              <td className="tabular">{t('perCase', { count: item.caseQty })}</td>
              <td className="tabular">
                {t('minCases', { count: Math.ceil(item.minQty / item.caseQty) })}
              </td>
              {showPrices && (
                <td className="tabular">{formatMoney(item.unitPriceCents, locale)}</td>
              )}
              {showPrices && (
                <td className="tabular">
                  {formatMoney(item.unitPriceCents * item.caseQty, locale)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {!showPrices && <p className="ls-note">{t('pricesAfterApproval')}</p>}
    </div>
  )
}
