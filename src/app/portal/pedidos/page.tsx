import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { db } from '@/lib/data'
import { businessDate, addBusinessDays } from '@/lib/datetime'
import { OrderCard } from '@/components/portal/order-card'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const VIEWS = ['hoy', 'proximos'] as const

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!can(role, 'orders')) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  const { vista } = await searchParams
  const view = (VIEWS as readonly string[]).includes(vista ?? '') ? vista : 'hoy'

  const today = businessDate(new Date())
  const orders =
    view === 'hoy'
      ? await db.listOrders({ date: today })
      : await db.listOrders({ from: addBusinessDays(today, 1), to: addBusinessDays(today, 14) })

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{t('titleOrders')}</h1>
      </header>

      <nav className="portal-tabs" aria-label={t('titleOrders')}>
        <ul className="portal-tabs__list">
          {VIEWS.map((v) => (
            <li key={v}>
              <Link
                href={`/portal/pedidos?vista=${v}`}
                className="portal-tabs__tab"
                aria-current={v === view ? 'true' : undefined}
              >
                {t(`view_${v}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="portal-empty">{t('noOrders')}</p>
      ) : (
        <ul className="ocard-list">
          {orders.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} locale={locale} canWrite={can(role, 'ordersWrite')} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
