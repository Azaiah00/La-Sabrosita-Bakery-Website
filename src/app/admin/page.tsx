import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { getDashboardData } from '@/lib/admin/reporting'
import { formatMoney } from '@/lib/money'
import { KpiTile } from '@/components/admin/kpi-tile'
import { SalesTrendChart, FoodCostChart } from '@/components/admin/trend-chart'
import { ChannelMixChart, TopProductsChart } from '@/components/admin/mix-charts'
import { CommissionSavedCard } from '@/components/admin/commission-saved-card'
import type { Period } from '@/lib/data/types'

export const metadata = { robots: { index: false, follow: false } }

const PERIODS: Period[] = ['week', 'month', 'quarter', 'year']

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  // The layout also gates this; a page that reads the money never relies
  // on a parent alone.
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'admin' })

  const { periodo } = await searchParams
  const period = (PERIODS as string[]).includes(periodo ?? '')
    ? (periodo as Period)
    : 'month'

  const data = await getDashboardData(period)
  const k = data.kpis

  const foodCostSeries = data.pnl.map((r) => ({
    month: r.month,
    foodCostPct: r.foodCostPct,
    laborPct: r.laborPct,
    primeCostPct: r.revenueCents
      ? ((r.cogsCents + r.laborCents) / r.revenueCents) * 100
      : 0,
    isPartial: r.isPartial,
  }))

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('dashboardTitle')}</h1>
        <p className="page-head__intro">
          {t('windowLabel', { from: data.window.from, to: data.window.to })}
        </p>
        {/* This is a management-reporting layer. It is not a POS, not an
            accounting system, and it should not pretend to be either. */}
        <p className="page-head__note">{t('scopeNote')}</p>
      </header>

      <nav className="admin-periods" aria-label={t('periodLabel')}>
        <ul className="admin-periods__list">
          {PERIODS.map((p) => (
            <li key={p}>
              <Link
                href={`/admin?periodo=${p}`}
                className="admin-periods__pill"
                aria-current={p === period ? 'true' : undefined}
              >
                {t(`period.${p}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Row 1 — six KPI tiles */}
      <section aria-labelledby="kpi-h" className="admin-row">
        <h2 id="kpi-h" className="admin-row__heading">
          {t('kpiHeading')}
        </h2>
        <div className="kpi-grid">
          <KpiTile
            label={t('kpi.revenue')}
            value={formatMoney(k.revenueCents, locale)}
            deltaPct={data.revenueDeltaPct}
            goodDirection="up"
          />
          <KpiTile
            label={t('kpi.netProfit')}
            value={formatMoney(
              data.pnl.reduce((s, r) => s + r.netProfitCents, 0),
              locale,
            )}
            goodDirection="up"
          />
          <KpiTile
            label={t('kpi.foodCostPct')}
            value={`${k.foodCostPct.toFixed(1)}%`}
            goodDirection="down"
          />
          <KpiTile
            label={t('kpi.laborPct')}
            value={`${k.laborPct.toFixed(1)}%`}
            goodDirection="down"
          />
          <KpiTile
            label={t('kpi.averageTicket')}
            value={formatMoney(k.averageTicketCents, locale)}
            goodDirection="up"
          />
          <KpiTile
            label={t('kpi.waste')}
            value={formatMoney(k.wasteCents, locale)}
            goodDirection="down"
          />
        </div>
      </section>

      {/* Row 2 — trends */}
      <section aria-labelledby="trend-h" className="admin-row">
        <h2 id="trend-h" className="admin-row__heading">
          {t('trendHeading')}
        </h2>
        <div className="chart-grid">
          <SalesTrendChart data={data.trend} locale={locale} />
          <FoodCostChart data={foodCostSeries} locale={locale} />
        </div>
      </section>

      {/* Row 3 — mix */}
      <section aria-labelledby="mix-h" className="admin-row">
        <h2 id="mix-h" className="admin-row__heading">
          {t('mixHeading')}
        </h2>
        <div className="chart-grid">
          <ChannelMixChart data={data.channels} locale={locale} />
          <TopProductsChart data={data.topProducts} locale={locale} />
        </div>
      </section>

      {/* Row 4 — the number that renews the retainer */}
      <section className="admin-row">
        <CommissionSavedCard rows={data.commission} locale={locale} />
      </section>

      <p className="admin-more">
        <Link href="/admin/reportes/pyg" className="btn btn--secondary">
          {t('pnl.open')}
        </Link>
      </p>
    </main>
  )
}
