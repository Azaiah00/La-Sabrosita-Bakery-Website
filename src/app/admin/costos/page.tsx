import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { getCostedCatalog, summarize } from '@/lib/admin/costing'
import { formatMoney } from '@/lib/money'
import { MarginTable } from '@/components/admin/margin-table'
import { KpiTile } from '@/components/admin/kpi-tile'

export const metadata = { robots: { index: false, follow: false } }

export default async function CostsPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'costs' })

  const rows = await getCostedCatalog()
  const s = summarize(rows)

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('title')}</h1>
        {/* The honest number on day one is that most products have no
            recipe. The screen says so rather than implying completeness. */}
        <p className="page-head__intro">
          {t('coverage', { with: s.withRecipeCount, total: s.totalCount })}
        </p>
      </header>

      <div className="kpi-grid">
        <KpiTile
          label={t('tile.avgMargin')}
          value={s.averageMarginPct === null ? '—' : `${s.averageMarginPct.toFixed(1)}%`}
        />
        <KpiTile
          label={t('tile.weightedMargin')}
          value={s.weightedMarginPct === null ? '—' : `${s.weightedMarginPct.toFixed(1)}%`}
          hint={t('tile.weightedHint')}
        />
        <KpiTile label={t('tile.soldAtLoss')} value={String(s.soldAtLossCount)} />
        <KpiTile label={t('tile.noRecipe')} value={String(s.noRecipeCount)} />
      </div>

      {/* Best by two different measures. They are rarely the same item,
          and an owner who optimises margin % alone kills their volume
          driver — so the screen says that out loud. */}
      {s.bestByMargin && s.bestByContribution && (
        <section className="best" aria-labelledby="best-h">
          <h2 id="best-h" className="admin-row__heading">
            {t('best.heading')}
          </h2>
          <div className="best__grid">
            <div className="best__card">
              <p className="best__label">{t('best.byMargin')}</p>
              <p className="best__name">{s.bestByMargin.name}</p>
              <p className="best__value tabular">
                {s.bestByMargin.marginPct?.toFixed(2)}%
              </p>
            </div>
            <div className="best__card">
              <p className="best__label">{t('best.byContribution')}</p>
              <p className="best__name">{s.bestByContribution.name}</p>
              <p className="best__value tabular">
                {formatMoney(
                  (s.bestByContribution.contributionCents ?? 0) *
                    s.bestByContribution.unitsSold,
                  locale,
                )}
              </p>
            </div>
          </div>
          <p className="best__note">{t('best.note')}</p>
        </section>
      )}

      <section className="admin-row" aria-labelledby="mt-h">
        <h2 id="mt-h" className="admin-row__heading">
          {t('tableHeading')}
        </h2>
        <MarginTable rows={rows} locale={locale} />
      </section>

      <p className="admin-more">
        <Link href="/admin/costos/simulador" className="btn btn--primary">
          {t('openSimulator')}
        </Link>
        <Link href="/admin/recetas" className="btn btn--secondary">
          {t('openRecipes')}
        </Link>
      </p>
    </main>
  )
}
