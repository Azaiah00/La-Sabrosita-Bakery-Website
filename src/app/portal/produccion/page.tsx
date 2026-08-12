import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { db } from '@/lib/data'
import { businessDate, addBusinessDays } from '@/lib/datetime'
import { ingredientShortfall } from '@/lib/portal/shortfall'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!can(role, 'production')) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  const { fecha } = await searchParams
  // Default to tomorrow — you plan the bake the night before.
  const date = fecha ?? addBusinessDays(businessDate(new Date()), 1)

  const [plan, stock, shortfalls] = await Promise.all([
    db.getProductionPlan(date),
    db.getDailyStock(date),
    ingredientShortfall(date),
  ])

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{t('titleProduction')}</h1>
        <p className="page-head__intro tabular">{date}</p>
      </header>

      {/* Named gap, not "check inventory". */}
      {shortfalls.length > 0 && (
        <div className="shortfall" role="alert">
          <p className="shortfall__title">{t('shortfallTitle')}</p>
          <ul className="shortfall__list">
            {shortfalls.map((s) => (
              <li key={s.ingredientId} className="tabular">
                {t('shortfallLine', {
                  qty: s.gap.toFixed(1),
                  unit: s.unitCode,
                  name: s.name,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mtable">
        <table className="mtable__table prod">
          <caption className="visually-hidden">{t('titleProduction')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col_product')}</th>
              <th scope="col">{t('col_fromOrders')}</th>
              <th scope="col">{t('col_par')}</th>
              <th scope="col">{t('col_toBake')}</th>
              <th scope="col">{t('col_done')}</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((row) => {
              const par = stock.find((s) => s.variantId === row.variantId)?.qtyAvailable ?? 0
              return (
                <tr key={row.variantId}>
                  <th scope="row">{row.name}</th>
                  <td className="tabular">{row.qtyNeeded}</td>
                  <td className="tabular">{par}</td>
                  {/* A hornear = de pedidos + par. */}
                  <td className="tabular prod__bake">{row.qtyNeeded + par}</td>
                  <td className="tabular">{row.qtyProduced || '—'}</td>
                </tr>
              )
            })}
            {plan.length === 0 && (
              <tr>
                <td colSpan={5}>{t('noProduction')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
