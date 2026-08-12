import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { AgingRow, Locale } from '@/lib/data/types'

/**
 * Receivables aging — the screen that gets money collected.
 *
 * Five buckets, in this order, with a total row. `over_90` in danger
 * colours and carrying its own label, because at ninety days past due
 * the conversation is different.
 *
 * A fully paid invoice has a zero balance and does not appear in any
 * bucket — the table is money outstanding, not money invoiced.
 */
export async function AgingTable({ rows, locale }: { rows: AgingRow[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'wholesale' })

  const BUCKETS = [
    { key: 'currentCents', label: t('bucket_current') },
    { key: 'd1to30Cents', label: t('bucket_1_30') },
    { key: 'd31to60Cents', label: t('bucket_31_60') },
    { key: 'd61to90Cents', label: t('bucket_61_90') },
    { key: 'over90Cents', label: t('bucket_over_90') },
  ] as const

  const totals = BUCKETS.map((b) => rows.reduce((s, r) => s + r[b.key], 0))
  const grand = rows.reduce((s, r) => s + r.totalCents, 0)

  return (
    <div className="mtable">
      <table className="mtable__table">
        <caption className="visually-hidden">{t('agingCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('col_account')}</th>
            {BUCKETS.map((b) => (
              <th key={b.key} scope="col">
                {b.label}
              </th>
            ))}
            <th scope="col">{t('col_total')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.wholesaleAccountId}>
              <th scope="row">{r.storeName}</th>
              {BUCKETS.map((b) => (
                <td
                  key={b.key}
                  className="tabular"
                  data-overdue={b.key === 'over90Cents' && r[b.key] > 0 ? '' : undefined}
                >
                  {r[b.key] === 0 ? '—' : formatMoney(r[b.key], locale)}
                </td>
              ))}
              <td className="tabular">{formatMoney(r.totalCents, locale)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7}>{t('noOutstanding')}</td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr data-total="">
              <th scope="row">{t('col_total')}</th>
              {totals.map((v, i) => (
                <td key={i} className="tabular">
                  {v === 0 ? '—' : formatMoney(v, locale)}
                </td>
              ))}
              <td className="tabular">{formatMoney(grand, locale)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
