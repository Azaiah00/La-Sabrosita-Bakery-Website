import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { businessDate, addBusinessDays, formatLocal } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { KpiTile } from '@/components/admin/kpi-tile'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Today at a glance — the first screen anybody opens. */
export default async function PortalToday() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  const today = businessDate(new Date())
  const yesterday = addBusinessDays(today, -1)

  const [todays, week, categories, waste] = await Promise.all([
    db.listOrders({ date: today }),
    db.listOrders({ from: today, to: addBusinessDays(today, 6) }),
    db.getMenu(locale),
    db.getWasteLog(yesterday, yesterday),
  ])

  const ready = todays.filter((o) => o.status === 'ready').length
  const cakesToday = todays.filter((o) => o.orderType === 'cake').length
  const cakesWeek = week.filter((o) => o.orderType === 'cake').length
  const eightySixed = categories.flatMap((c) => c.products).filter((p) => p.is86ed)
  const wasteYesterday = waste.reduce((s, w) => s + w.estValueCents, 0)

  const nextSix = todays
    .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
    .slice(0, 6)

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{t('titleToday')}</h1>
      </header>

      <div className="kpi-grid">
        <KpiTile label={t('tileOrdersToday')} value={String(todays.length)} />
        <KpiTile label={t('tileReady')} value={String(ready)} />
        <KpiTile label={t('tileCakesToday')} value={String(cakesToday)} />
        <KpiTile label={t('tileCakesWeek')} value={String(cakesWeek)} />
        <KpiTile label={t('tile86')} value={String(eightySixed.length)} />
        <KpiTile label={t('tileWaste')} value={formatMoney(wasteYesterday, locale)} />
      </div>

      <section className="admin-row" aria-labelledby="next-h">
        <h2 id="next-h" className="admin-row__heading">
          {t('nextPickups')}
        </h2>
        {nextSix.length === 0 ? (
          <p className="portal-empty">{t('noOrders')}</p>
        ) : (
          <ul className="next-list">
            {nextSix.map((o) => (
              <li key={o.id} className="next-list__item">
                <span className="tabular">
                  {o.pickupAt ? formatLocal(new Date(o.pickupAt), 'HH:mm') : '—'}
                </span>
                <Link href={`/portal/pedidos/${o.id}`}>{o.contactName}</Link>
                <span className="tabular">{t('itemCount', { count: o.items.length })}</span>
                <span className="chip" data-status={o.status}>
                  {t(`status_${o.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shift notes: what is off the board right now. */}
      <section className="admin-row" aria-labelledby="shift-h">
        <h2 id="shift-h" className="admin-row__heading">
          {t('shiftNotes')}
        </h2>
        {eightySixed.length === 0 ? (
          <p className="portal-empty">{t('nothing86')}</p>
        ) : (
          <ul className="shift-notes">
            {eightySixed.map((p) => (
              <li key={p.id}>
                <span className="chip" data-status="sold_at_loss">
                  {t('soldOut')}
                </span>{' '}
                {p.nameEs}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
