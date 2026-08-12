import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale } from '@/lib/data/types'
import type { CostedRow } from '@/lib/admin/costing'

/**
 * The whole catalogue, costed.
 *
 * `sold_at_loss` and `no_recipe` are pinned to the top by
 * `getCostedCatalog` — those are the rows the owner needs to see, and
 * burying them under forty healthy ones defeats the screen.
 *
 * A product with no recipe shows a dash and a `no_recipe` chip, never a
 * $0 cost and never a 100% margin.
 */
export async function MarginTable({
  rows,
  locale,
}: {
  rows: CostedRow[]
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'costs' })

  /** Food cost is numeric(12,4) and sub-cent by nature — show 4 places. */
  const cost = (n: number | null) =>
    n === null
      ? '—'
      : new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(n)

  return (
    <div className="mtable">
      <table className="mtable__table">
        <caption className="visually-hidden">{t('tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('col.product')}</th>
            <th scope="col">{t('col.price')}</th>
            <th scope="col">{t('col.cost')}</th>
            <th scope="col">{t('col.contribution')}</th>
            <th scope="col">{t('col.margin')}</th>
            <th scope="col">{t('col.sold')}</th>
            <th scope="col">{t('col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variantId} data-status={r.status}>
              <th scope="row">{r.name}</th>
              <td className="tabular" data-provisional="true">
                {formatMoney(r.priceCents, locale)}
              </td>
              <td className="tabular">{cost(r.foodCost)}</td>
              <td className="tabular">
                {r.contributionCents === null ? '—' : formatMoney(r.contributionCents, locale)}
              </td>
              <td className="tabular">
                {r.marginPct === null ? '—' : `${r.marginPct.toFixed(2)}%`}
              </td>
              <td className="tabular">{r.unitsSold}</td>
              <td>
                {/* Status is never colour alone — the chip carries a word. */}
                <span className="chip" data-status={r.status}>
                  {t(`status.${r.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
