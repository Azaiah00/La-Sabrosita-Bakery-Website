import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { businessDate } from '@/lib/datetime'
import { RouteSheet } from '@/components/admin/route-sheet'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'wholesale' })
  const days = await getTranslations({ locale, namespace: 'hours' })

  const { dia } = await searchParams
  const todayDow = new Date(businessDate(new Date()) + 'T00:00:00Z').getUTCDay()
  const dow = dia !== undefined && !Number.isNaN(Number(dia)) ? Number(dia) : todayDow

  const routes = await db.getRouteSheet(dow)

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head portal-noprint">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('routesTitle')}</h1>
        <p className="page-head__intro">{t('routesLede')}</p>
      </header>

      <nav className="admin-periods portal-noprint" aria-label={t('routesTitle')}>
        <ul className="admin-periods__list">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <li key={d}>
              <Link
                href={`/admin/mayoreo/rutas?dia=${d}`}
                className="admin-periods__pill"
                aria-current={d === dow ? 'true' : undefined}
              >
                {days(`days.${d}` as 'days.0')}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <RouteSheet routes={routes} dow={dow} locale={locale} />

      <p className="admin-more portal-noprint">
        <Link href="/admin/mayoreo" className="btn btn--secondary">
          {t('backToAccounts')}
        </Link>
      </p>
    </main>
  )
}
