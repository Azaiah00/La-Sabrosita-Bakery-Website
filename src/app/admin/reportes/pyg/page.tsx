import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { markPartialMonths } from '@/lib/admin/reporting'
import { PnlTable } from '@/components/admin/pnl-table'

export const metadata = { robots: { index: false, follow: false } }

export default async function PnlPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'admin' })

  const pnl = await db.getPnl(12)
  const allDays = await db.getSalesDays('0000-01-01', '9999-12-31')
  const rows = markPartialMonths(
    pnl,
    allDays[0]?.businessDate ?? '',
    allDays[allDays.length - 1]?.businessDate ?? '',
  )

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('pnl.title')}</h1>
        <p className="page-head__note">{t('scopeNote')}</p>
      </header>

      <PnlTable rows={rows} locale={locale} />
    </main>
  )
}
