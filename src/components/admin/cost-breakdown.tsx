import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale, Recipe } from '@/lib/data/types'

export interface LineCost {
  name: string
  qty: number
  unitCode: string
  costDollars: number
  sharePct: number
  isSubRecipe: boolean
}

/**
 * The batch → unit → margin chain, at four decimal places.
 *
 * Nothing is rounded on the way through. `recipe_cost()` returns
 * numeric at 4dp precisely so the intermediate values survive; rounding
 * early is how a per-unit cost drifts by a cent and a margin by a point.
 *
 * Against the seeded data this table reads:
 *   batch (48 units)  $18.9277
 *   per unit          $0.3943
 *   price             $1.7500
 *   contribution      $1.3557
 *   margin             77.47%
 * Those are verified reference values — see CLAUDE.md. If this screen
 * shows anything else from the same seed, the implementation is wrong.
 */
export async function CostBreakdown({
  recipe,
  lines,
  batchCost,
  unitCost,
  priceCents,
  marginPct,
  locale,
}: {
  recipe: Recipe
  lines: LineCost[]
  batchCost: number
  unitCost: number | null
  priceCents: number | null
  marginPct: number | null
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'costs' })

  const cost4 = (n: number) =>
    new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(n)

  const contribution =
    priceCents !== null && unitCost !== null ? priceCents / 100 - unitCost : null

  return (
    <div className="breakdown">
      <ul className="breakdown__lines">
        {lines.map((line) => (
          <li key={line.name} className="breakdown__line" data-sub={line.isSubRecipe || undefined}>
            <span className="breakdown__name">
              {line.isSubRecipe && <span aria-hidden="true">↳ </span>}
              {line.name}
            </span>
            <span className="breakdown__qty tabular">
              {line.qty} {line.unitCode}
            </span>
            <span className="breakdown__cost tabular">{cost4(line.costDollars)}</span>
            <span className="breakdown__share tabular">{line.sharePct.toFixed(1)}%</span>
            {/* Share of batch cost, as a bar. One hue: this is magnitude,
                not identity, so every bar is the same colour. */}
            <span className="breakdown__bar" aria-hidden="true">
              <span className="breakdown__fill" style={{ inlineSize: `${line.sharePct}%` }} />
            </span>
          </li>
        ))}
      </ul>

      <dl className="breakdown__totals">
        <div>
          <dt>{t('batchCost', { yield: recipe.yieldQty, unit: recipe.yieldUnitCode })}</dt>
          <dd className="tabular">{cost4(batchCost)}</dd>
        </div>
        <div>
          <dt>{t('unitCost')}</dt>
          <dd className="tabular">{unitCost === null ? '—' : cost4(unitCost)}</dd>
        </div>
        <div>
          <dt>{t('sellPrice')}</dt>
          <dd className="tabular">
            {priceCents === null ? '—' : formatMoney(priceCents, locale)}
          </dd>
        </div>
        <div>
          <dt>{t('contribution')}</dt>
          <dd className="tabular">{contribution === null ? '—' : cost4(contribution)}</dd>
        </div>
        <div className="breakdown__margin">
          <dt>{t('margin')}</dt>
          <dd className="tabular">{marginPct === null ? '—' : `${marginPct.toFixed(2)}%`}</dd>
        </div>
      </dl>
    </div>
  )
}
