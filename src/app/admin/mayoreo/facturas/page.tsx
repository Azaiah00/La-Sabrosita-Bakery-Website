import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { businessDate } from '@/lib/datetime'
import { AgingTable } from '@/components/admin/aging-table'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'wholesale' })

  const [invoices, aging] = await Promise.all([db.getInvoices(), db.getAging()])
  const today = businessDate(new Date())

  const daysLate = (due: string) =>
    Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86_400_000)

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('invoicesTitle')}</h1>
      </header>

      <section className="admin-row" aria-labelledby="aging-h">
        <h2 id="aging-h" className="admin-row__heading">
          {t('agingHeading')}
        </h2>
        <AgingTable rows={aging} locale={locale} />
      </section>

      <section className="admin-row" aria-labelledby="inv-h">
        <h2 id="inv-h" className="admin-row__heading">
          {t('invoicesHeading')}
        </h2>
        <div className="mtable">
          <table className="mtable__table">
            <caption className="visually-hidden">{t('invoicesCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('col_invoice')}</th>
                <th scope="col">{t('col_store')}</th>
                <th scope="col">{t('col_issued')}</th>
                <th scope="col">{t('col_due')}</th>
                <th scope="col">{t('col_total')}</th>
                <th scope="col">{t('col_paid')}</th>
                <th scope="col">{t('col_balance')}</th>
                <th scope="col">{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => {
                const late = i.balanceCents > 0 ? daysLate(i.dueDate) : 0
                return (
                  <tr key={i.id}>
                    <th scope="row" className="tabular">
                      {i.invoiceNumber}
                    </th>
                    <td>{i.storeName}</td>
                    <td className="tabular">{i.issueDate}</td>
                    <td className="tabular" data-overdue={late > 0 ? '' : undefined}>
                      {i.dueDate}
                      {late > 0 && (
                        <span className="inv-late"> {t('daysLate', { days: late })}</span>
                      )}
                    </td>
                    <td className="tabular">{formatMoney(i.totalCents, locale)}</td>
                    <td className="tabular">{formatMoney(i.amountPaidCents, locale)}</td>
                    <td className="tabular">{formatMoney(i.balanceCents, locale)}</td>
                    <td>
                      <span className="chip" data-ws={i.status}>
                        {t(`invoice_${i.status}`)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="admin-more">
        <Link href="/admin/mayoreo" className="btn btn--secondary">
          {t('backToAccounts')}
        </Link>
      </p>
    </main>
  )
}
