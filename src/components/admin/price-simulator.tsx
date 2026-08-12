'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { formatMoney } from '@/lib/money'
import { runIngredientShock } from '@/app/admin/costos/simulador/actions'
import type { SimRow } from '@/lib/admin/costing'
import type { IngredientOnHand, Locale } from '@/lib/data/types'

/**
 * The ingredient-shock simulator.
 *
 * "What if butter goes up 15%?" — and every affected product's cost,
 * margin, and hold-the-margin price move at once.
 *
 * NOTHING IS WRITTEN. The action re-costs a clone and returns it.
 */
export function PriceSimulator({
  ingredients,
  locale,
}: {
  ingredients: IngredientOnHand[]
  locale: Locale
}) {
  const t = useTranslations('costs')
  const [deltas, setDeltas] = useState<Record<string, number>>({})
  const [rows, setRows] = useState<SimRow[] | null>(null)
  const [pending, startTransition] = useTransition()

  const active = Object.entries(deltas).filter(([, v]) => v !== 0)

  function run() {
    startTransition(async () => {
      setRows(await runIngredientShock(Object.fromEntries(active)))
    })
  }

  const cost = (n: number | null) =>
    n === null
      ? '—'
      : new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(n)

  // The plain-language line. Written in Spanish first, then English —
  // the person reading this built the business from a home kitchen and
  // does not need the phrase "contribution margin variance".
  const headline = (() => {
    if (!rows?.length || active.length !== 1) return null
    const [id, pct] = active[0]
    const ing = ingredients.find((i) => i.id === id)
    const worst = [...rows].sort(
      (a, b) => (a.afterMarginPct ?? 0) - (b.afterMarginPct ?? 0),
    )[0]
    if (!ing || !worst || worst.beforeMarginPct === null || worst.afterMarginPct === null) {
      return null
    }
    return t('summary', {
      ingredient: ing.name,
      pct: pct > 0 ? `+${pct}` : String(pct),
      product: worst.name,
      before: worst.beforeMarginPct.toFixed(1),
      after: worst.afterMarginPct.toFixed(1),
      price:
        worst.priceToHoldMarginCents === null
          ? '—'
          : formatMoney(worst.priceToHoldMarginCents, locale),
    })
  })()

  return (
    <div className="sim">
      <div className="sim__inputs">
        <h3 className="sim__heading">{t('shockHeading')}</h3>
        <p className="sim__note">{t('shockNote')}</p>
        <ul className="sim__list">
          {ingredients.map((ing) => (
            <li key={ing.id} className="sim__row">
              <label className="sim__label" htmlFor={`d-${ing.id}`}>
                {ing.name}
                <span className="sim__unit"> · {cost(ing.lastUnitCost)}/{ing.stockUnitCode}</span>
              </label>
              <div className="sim__control">
                <input
                  id={`d-${ing.id}`}
                  className="sim__input tabular"
                  type="number"
                  step="1"
                  min="-99"
                  max="300"
                  inputMode="decimal"
                  value={deltas[ing.id] ?? 0}
                  onChange={(e) =>
                    setDeltas((d) => ({ ...d, [ing.id]: Number(e.target.value) }))
                  }
                />
                <span aria-hidden="true">%</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="sim__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={run}
            disabled={pending || active.length === 0}
          >
            {pending ? t('running') : t('run')}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setDeltas({})
              setRows(null)
            }}
          >
            {t('reset')}
          </button>
        </div>
      </div>

      <div className="sim__results" aria-live="polite">
        {headline && <p className="sim__headline">{headline}</p>}

        {rows && rows.length === 0 && <p className="sim__note">{t('noEffect')}</p>}

        {rows && rows.length > 0 && (
          <table className="mtable__table">
            <caption className="visually-hidden">{t('resultsCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('col.product')}</th>
                <th scope="col">{t('col.costBefore')}</th>
                <th scope="col">{t('col.costAfter')}</th>
                <th scope="col">{t('col.marginBefore')}</th>
                <th scope="col">{t('col.marginAfter')}</th>
                <th scope="col">{t('col.holdPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta =
                  r.afterMarginPct !== null && r.beforeMarginPct !== null
                    ? r.afterMarginPct - r.beforeMarginPct
                    : 0
                return (
                  <tr key={r.variantId}>
                    <th scope="row">{r.name}</th>
                    <td className="tabular">{cost(r.beforeCost)}</td>
                    <td className="tabular">{cost(r.afterCost)}</td>
                    <td className="tabular">
                      {r.beforeMarginPct === null ? '—' : `${r.beforeMarginPct.toFixed(2)}%`}
                    </td>
                    <td className="tabular" data-delta={delta < 0 ? 'down' : delta > 0 ? 'up' : undefined}>
                      {r.afterMarginPct === null ? '—' : `${r.afterMarginPct.toFixed(2)}%`}
                    </td>
                    <td className="tabular">
                      {r.priceToHoldMarginCents === null
                        ? '—'
                        : formatMoney(r.priceToHoldMarginCents, locale)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {rows && <p className="sim__note">{t('nothingSaved')}</p>}
      </div>
    </div>
  )
}
