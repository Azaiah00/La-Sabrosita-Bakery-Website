'use client'

import { useTranslations } from 'next-intl'
import { formatMoney } from '@/lib/money'
import type { Locale, CakeSize, CakeOption } from '@/lib/data/types'
import { selectedSlugs, type ConfiguratorState } from './state'

/**
 * PROMPT-07: a running price summary visible at EVERY step — sticky at
 * the bottom on mobile, a sidebar on desktop. Base plus each delta as a
 * line item, then the total, then the deposit. Never a surprise at the
 * end.
 *
 * This is a PREVIEW. The server recomputes all of it from the same
 * tables at submit time and its answer is the one that gets charged.
 */
export function PriceSummary({
  state,
  sizes,
  options,
  locale,
  taxRate,
  depositPct,
}: {
  state: ConfiguratorState
  sizes: CakeSize[]
  options: CakeOption[]
  locale: Locale
  taxRate: number
  depositPct: number
}) {
  const t = useTranslations('configurator')
  const size = sizes.find((s) => s.id === state.sizeId)
  if (!size) return null

  const slugs = selectedSlugs(state)
  const deltas = options.filter((o) => slugs.includes(o.slug) && o.priceDeltaCents !== 0)

  const subtotal = size.basePriceCents + deltas.reduce((sum, o) => sum + o.priceDeltaCents, 0)
  const tax = Math.round(subtotal * taxRate)
  const total = subtotal + tax
  const deposit = Math.round(total * (depositPct / 100))
  const isQuote = state.occasion === 'boda'

  return (
    <aside className="psum" aria-labelledby="psum-h">
      <h2 id="psum-h" className="psum__heading">
        {t('summaryHeading')}
      </h2>
      <dl className="psum__lines">
        <div className="psum__line">
          <dt>{size.label}</dt>
          <dd className="tabular">{formatMoney(size.basePriceCents, locale)}</dd>
        </div>
        {deltas.map((o) => (
          <div key={o.id} className="psum__line">
            <dt>{o.label}</dt>
            <dd className="tabular">+{formatMoney(o.priceDeltaCents, locale)}</dd>
          </div>
        ))}
        <div className="psum__line">
          <dt>{t('tax')}</dt>
          <dd className="tabular">{formatMoney(tax, locale)}</dd>
        </div>
        <div className="psum__line psum__line--total">
          <dt>{t('total')}</dt>
          <dd className="tabular">{formatMoney(total, locale)}</dd>
        </div>
        {!isQuote && (
          <div className="psum__line psum__line--deposit">
            <dt>{t('depositLine', { pct: depositPct })}</dt>
            <dd className="tabular">{formatMoney(deposit, locale)}</dd>
          </div>
        )}
      </dl>
      <p className="psum__note">{isQuote ? t('quoteNote') : t('estimateNote')}</p>
    </aside>
  )
}
