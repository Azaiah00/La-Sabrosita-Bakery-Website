import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { AccountActions } from '@/components/admin/account-actions'
import { LineSheet } from '@/components/wholesale/line-sheet'
import type { WholesaleStatus } from '@/lib/data/types'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Pending accounts first — those are the ones waiting on someone. */
const RANK: Record<WholesaleStatus, number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
  closed: 3,
}

export default async function WholesaleAccountsPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'wholesale' })
  const days = await getTranslations({ locale, namespace: 'hours' })

  const [accounts, invoices] = await Promise.all([db.getWholesaleAccounts(), db.getInvoices()])
  const sorted = [...accounts].sort((a, b) => RANK[a.status] - RANK[b.status])

  const balanceFor = (id: string) =>
    invoices.filter((i) => i.wholesaleAccountId === id).reduce((s, i) => s + i.balanceCents, 0)

  // The line sheet as the accounts see it — in cases, with prices.
  const priceList = await db.getPriceList(
    accounts.find((a) => a.status === 'approved')?.id ?? '',
  )

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('accountsTitle')}</h1>
        <p className="page-head__intro">{t('accountsLede', { count: accounts.length })}</p>
      </header>

      <div className="mtable">
        <table className="mtable__table">
          <caption className="visually-hidden">{t('accountsCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col_store')}</th>
              <th scope="col">{t('col_city')}</th>
              <th scope="col">{t('col_day')}</th>
              <th scope="col">{t('col_route')}</th>
              <th scope="col">{t('col_terms')}</th>
              <th scope="col">{t('col_balance')}</th>
              <th scope="col">{t('col_status')}</th>
              <th scope="col">{t('col_action')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} data-status={a.status}>
                <th scope="row">{a.storeName}</th>
                <td>
                  {a.city}, {a.region}
                </td>
                <td>{a.deliveryDow === null ? '—' : days(`days.${a.deliveryDow}` as 'days.0')}</td>
                <td>{a.deliveryRoute ?? '—'}</td>
                <td className="tabular">{t('netDays', { days: a.creditTermsDays })}</td>
                <td className="tabular">{formatMoney(balanceFor(a.id), locale)}</td>
                <td>
                  <span className="chip" data-ws={a.status}>
                    {t(`status_${a.status}`)}
                  </span>
                </td>
                <td>
                  <AccountActions id={a.id} status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approving here is the demo moment: the account picks up the
          default price list and appears on its route sheet. */}
      <p className="chamber__note">{t('approveNote')}</p>

      <section className="admin-row" aria-labelledby="ls-admin">
        <h2 id="ls-admin" className="admin-row__heading">
          {t('lineSheetHeading')}
        </h2>
        <LineSheet items={priceList} locale={locale} showPrices />
      </section>

      <p className="admin-more">
        <Link href="/admin/mayoreo/rutas" className="btn btn--primary">
          {t('openRoutes')}
        </Link>
        <Link href="/admin/mayoreo/facturas" className="btn btn--secondary">
          {t('openInvoices')}
        </Link>
      </p>
    </main>
  )
}
