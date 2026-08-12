import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { statusFor, type MarginStatus } from '@/lib/admin/costing'
import { formatMoney } from '@/lib/money'

export const metadata = { robots: { index: false, follow: false } }

const RANK: Record<MarginStatus, number> = {
  sold_at_loss: 0,
  no_recipe: 1,
  thin_margin: 2,
  ok: 3,
}

export default async function RecipesPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'costs' })

  const [recipes, margins] = await Promise.all([db.getRecipes(), db.getMarginTable()])

  const rows = await Promise.all(
    recipes.map(async (r) => {
      const batchCost = await db.getRecipeCost(r.id)
      const margin = r.variantId ? margins.find((m) => m.variantId === r.variantId) : undefined
      return {
        recipe: r,
        batchCost,
        unitCost: r.yieldQty ? batchCost / r.yieldQty : null,
        margin,
        status: margin ? statusFor(margin) : ('no_recipe' as MarginStatus),
        isSubRecipe: r.variantId === null,
      }
    }),
  )

  rows.sort((a, b) => {
    if (a.isSubRecipe !== b.isSubRecipe) return a.isSubRecipe ? 1 : -1
    return RANK[a.status] - RANK[b.status]
  })

  const withRecipe = margins.filter((m) => m.foodCost !== null).length

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('recipesTitle')}</h1>
        <p className="page-head__intro">
          {t('coverage', { with: withRecipe, total: margins.length })}
        </p>
      </header>

      <div className="mtable">
        <table className="mtable__table">
          <caption className="visually-hidden">{t('recipesCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col.recipe')}</th>
              <th scope="col">{t('col.yield')}</th>
              <th scope="col">{t('col.batchCost')}</th>
              <th scope="col">{t('col.unitCost')}</th>
              <th scope="col">{t('col.margin')}</th>
              <th scope="col">{t('col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.recipe.id} data-status={r.status}>
                <th scope="row">
                  <Link href={`/admin/recetas/${r.recipe.id}`}>{r.recipe.name}</Link>
                  {r.isSubRecipe && <span className="chip chip--sub">{t('subRecipe')}</span>}
                </th>
                <td className="tabular">
                  {r.recipe.yieldQty} {r.recipe.yieldUnitCode}
                </td>
                <td className="tabular">{formatMoney(Math.round(r.batchCost * 100), locale)}</td>
                <td className="tabular">
                  {r.unitCost === null
                    ? '—'
                    : new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      }).format(r.unitCost)}
                </td>
                <td className="tabular">
                  {r.margin?.marginPct == null ? '—' : `${r.margin.marginPct.toFixed(2)}%`}
                </td>
                <td>
                  {r.isSubRecipe ? (
                    <span className="chip chip--sub">{t('subRecipe')}</span>
                  ) : (
                    <span className="chip" data-status={r.status}>
                      {t(`status.${r.status}`)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-more">
        <Link href="/admin/costos" className="btn btn--secondary">
          {t('backToCosts')}
        </Link>
      </p>
    </main>
  )
}
