import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale, PnlRow } from '@/lib/data/types'

type Row = PnlRow & { isPartial: boolean }

/**
 * Profit and loss, months as columns.
 *
 * Two rules from PROMPT-12 that matter more than they look:
 *
 * - NEGATIVES CARRY A MINUS SIGN, never parentheses. Parentheses are an
 *   accounting convention that reads as a typo to everyone else, and
 *   this screen is for the owner, not for her accountant.
 * - PARTIAL MONTHS ARE LABELLED. A month holding eleven days of sales
 *   against a full month of rent and payroll shows a loss; that is
 *   arithmetic, and the label is what stops it reading as a collapse.
 */
export async function PnlTable({ rows, locale }: { rows: Row[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'admin' })

  const money = (cents: number) => formatMoney(cents, locale)
  const pct = (n: number) => `${n.toFixed(1)}%`
  const neg = (cents: number) => (cents < 0 ? 'is-negative' : undefined)

  const monthLabel = (month: string) =>
    new Date(`${month}-01T12:00:00Z`).toLocaleDateString(
      locale === 'es' ? 'es-US' : 'en-US',
      { month: 'short', year: '2-digit', timeZone: 'UTC' },
    )

  const lines: { key: string; label: string; indent?: boolean; get: (r: Row) => number }[] = [
    { key: 'revenue', label: t('pnl.revenue'), get: (r) => r.revenueCents },
    { key: 'cogs', label: t('pnl.cogs'), indent: true, get: (r) => r.cogsCents },
    { key: 'labor', label: t('pnl.labor'), indent: true, get: (r) => r.laborCents },
    { key: 'overhead', label: t('pnl.overhead'), indent: true, get: (r) => r.overheadCents },
    { key: 'gross', label: t('pnl.grossProfit'), get: (r) => r.grossProfitCents },
    { key: 'net', label: t('pnl.netProfit'), get: (r) => r.netProfitCents },
  ]

  return (
    <div className="pnl">
      <table className="pnl__table">
        <caption className="visually-hidden">{t('pnl.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('pnl.line')}</th>
            {rows.map((r) => (
              <th key={r.month} scope="col" className="tabular">
                {monthLabel(r.month)}
                {r.isPartial && <span className="pnl__partial">{t('partial')}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} data-total={line.key === 'net' || undefined}>
              <th scope="row" data-indent={line.indent || undefined}>
                {line.label}
              </th>
              {rows.map((r) => (
                <td key={r.month} className={`tabular ${neg(line.get(r)) ?? ''}`}>
                  {money(line.get(r))}
                </td>
              ))}
            </tr>
          ))}

          <tr className="pnl__spacer">
            <td colSpan={rows.length + 1} />
          </tr>

          <tr>
            <th scope="row">{t('pnl.foodCostPct')}</th>
            {rows.map((r) => (
              <td key={r.month} className="tabular">
                {pct(r.foodCostPct)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t('pnl.laborPct')}</th>
            {rows.map((r) => (
              <td key={r.month} className="tabular">
                {pct(r.laborPct)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t('pnl.primePct')}</th>
            {rows.map((r) => (
              <td key={r.month} className="tabular">
                {pct(
                  r.revenueCents
                    ? ((r.cogsCents + r.laborCents) / r.revenueCents) * 100
                    : 0,
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Rules of thumb, presented as reference — not as a diagnosis. */}
      <p className="pnl__bench">{t('pnl.benchmarks')}</p>
    </div>
  )
}
