import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { StaffShell } from '@/components/portal/staff-shell'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'

export const metadata = { robots: { index: false, follow: false } }

/**
 * The owner's side of the house.
 *
 * `counter` and `baker` are turned away here, not merely un-linked. In
 * production RLS enforces the same boundary at the database; this check
 * is the second lock, never the only one.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await staffLocale()
  const role = await currentRole()

  if (!role) redirect('/portal/entrar')

  if (!canSeeAdmin(role)) {
    const t = await getTranslations({ locale, namespace: 'staff' })
    return (
      <StaffShell locale={locale}>
        <main id="contenido" className="shell">
          <header className="page-head">
            <h1 className="page-head__title">{t('forbiddenTitle')}</h1>
            <p className="page-head__intro">{t('forbiddenBody')}</p>
          </header>
          <p>
            <Link href="/portal/pedidos" className="btn btn--secondary">
              {t('backToPortal')}
            </Link>
          </p>
        </main>
      </StaffShell>
    )
  }

  return <StaffShell locale={locale}>{children}</StaffShell>
}
