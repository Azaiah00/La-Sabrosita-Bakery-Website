import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { db } from '@/lib/data'
import { businessDate, addBusinessDays, formatLocal } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { logWasteEntry } from '@/app/actions/portal'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The waste log.
 *
 * Two taps per item, one screen. This is usually the fastest money a
 * bakery ever finds, and if logging it takes more than twenty seconds
 * nobody does it — so there is no wizard, no modal and no second page.
 */
export default async function WastePage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!can(role, 'waste')) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  const today = businessDate(new Date())
  const weekStart = addBusinessDays(today, -6)
  const priorStart = addBusinessDays(today, -13)

  const [thisWeek, priorWeek, categories] = await Promise.all([
    db.getWasteLog(weekStart, today),
    db.getWasteLog(priorStart, addBusinessDays(today, -7)),
    db.getMenu(locale),
  ])

  const total = thisWeek.reduce((s, w) => s + w.estValueCents, 0)
  const priorTotal = priorWeek.reduce((s, w) => s + w.estValueCents, 0)
  const variants = categories.flatMap((c) =>
    c.products.flatMap((p) => p.variants.map((v) => ({ ...v, product: p.nameEs }))),
  )

  const REASONS = ['end_of_day', 'damaged', 'expired', 'mistake', 'sample', 'staff_meal', 'other']

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{t('titleWaste')}</h1>
      </header>

      <div className="waste-totals">
        <div className="kpi">
          <p className="kpi__label">{t('wasteThisWeek')}</p>
          <p className="kpi__value tabular">{formatMoney(total, locale)}</p>
        </div>
        <div className="kpi">
          <p className="kpi__label">{t('wasteLastWeek')}</p>
          <p className="kpi__value tabular">{formatMoney(priorTotal, locale)}</p>
        </div>
      </div>

      <form action={logWasteEntry} className="waste-form">
        <div className="waste-form__row">
          <label className="cfg-label" htmlFor="w-variant">
            {t('wasteProduct')}
          </label>
          <select id="w-variant" name="variantId" className="cfg-input" required>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product} — {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="waste-form__row">
          <label className="cfg-label" htmlFor="w-qty">
            {t('wasteQty')}
          </label>
          <input
            id="w-qty"
            name="qty"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            className="cfg-input tabular"
            required
          />
        </div>
        <div className="waste-form__row">
          <label className="cfg-label" htmlFor="w-reason">
            {t('wasteReason')}
          </label>
          <select id="w-reason" name="reason" className="cfg-input" defaultValue="end_of_day">
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`reason_${r}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary">
          {t('wasteAdd')}
        </button>
      </form>

      <div className="mtable">
        <table className="mtable__table">
          <caption className="visually-hidden">{t('titleWaste')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col_when')}</th>
              <th scope="col">{t('col_product')}</th>
              <th scope="col">{t('col_qty')}</th>
              <th scope="col">{t('col_reason')}</th>
              <th scope="col">{t('col_value')}</th>
            </tr>
          </thead>
          <tbody>
            {thisWeek.map((w) => (
              <tr key={w.id}>
                <th scope="row" className="tabular">
                  {formatLocal(new Date(w.occurredAt), 'd MMM HH:mm')}
                </th>
                <td>{w.name}</td>
                <td className="tabular">{w.qty}</td>
                <td>{t(`reason_${w.reason}`)}</td>
                <td className="tabular">{formatMoney(w.estValueCents, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
