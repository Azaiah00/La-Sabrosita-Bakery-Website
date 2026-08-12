import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { CostBreakdown, type LineCost } from '@/components/admin/cost-breakdown'

export const metadata = { robots: { index: false, follow: false } }

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const { id } = await params
  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'costs' })

  const recipes = await db.getRecipes()
  const recipe = recipes.find((r) => r.id === id)
  if (!recipe) notFound()

  // Line costs come from the SAME path as the batch total, so the parts
  // always add up to the whole.
  const [batchCost, rawLines, margins] = await Promise.all([
    db.getRecipeCost(recipe.id),
    db.getRecipeLineCosts(recipe.id),
    db.getMarginTable(),
  ])

  const margin = recipe.variantId
    ? margins.find((m) => m.variantId === recipe.variantId)
    : undefined

  const lines: LineCost[] = rawLines.map((line) => ({
    ...line,
    sharePct: batchCost ? (line.costDollars / batchCost) * 100 : 0,
  }))

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{recipe.name}</h1>
        <p className="page-head__intro">
          {t('yieldLine', {
            qty: recipe.yieldQty,
            unit: recipe.yieldUnitCode,
            minutes: recipe.laborMinutes,
          })}
        </p>
        {recipe.variantId === null && <p className="chip chip--sub">{t('subRecipe')}</p>}
      </header>

      <CostBreakdown
        recipe={recipe}
        lines={lines}
        batchCost={batchCost}
        unitCost={margin?.foodCost ?? (recipe.yieldQty ? batchCost / recipe.yieldQty : null)}
        priceCents={margin?.priceCents ?? null}
        marginPct={margin?.marginPct ?? null}
        locale={locale}
      />

      <p className="admin-more">
        <Link href="/admin/recetas" className="btn btn--secondary">
          {t('backToRecipes')}
        </Link>
      </p>
    </main>
  )
}
