'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatMoney } from '@/lib/money'
import { searchIndexFor } from '@/lib/menu'
import type { Locale, Product } from '@/lib/data/types'

/**
 * DESIGN.md §6 — menu row, list density.
 *
 * The Spanish name is the real name and leads on /es. On /en the English
 * gloss leads and the Spanish sits beneath — it is still worth learning
 * either way, which is why it never disappears.
 *
 * Price sits at the natural right edge of the row. NO leader dots, and
 * deliberately NOT aligned into a scannable column: guests should read
 * the food first.
 *
 * Rendered server-side by the section; this component is a client
 * component only because the variant selector and the description
 * expander need state. The markup is in the initial HTML either way, so
 * crawlers and no-JS visitors see every item and every price.
 */
export function MenuRow({
  product,
  locale,
  featured,
}: {
  product: Product
  locale: Locale
  featured?: boolean
}) {
  const t = useTranslations('menu')
  const [variantId, setVariantId] = useState(
    (product.variants.find((v) => v.isDefault) ?? product.variants[0])?.id,
  )
  const [expanded, setExpanded] = useState(false)

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const primary = locale === 'en' ? product.nameEn : product.nameEs
  const secondary = locale === 'en' ? product.nameEs : product.nameEn
  const showSecondary = secondary !== primary

  return (
    <li
      className="mrow"
      data-menu-row=""
      data-search={searchIndexFor(product)}
      data-tags={product.dietaryTags.join(' ')}
      data-sold-out={product.is86ed || undefined}
      data-featured={featured || undefined}
    >
      <div className="mrow__body">
        <p className="mrow__name" lang={locale === 'en' ? 'en' : 'es'}>
          {primary}
          {featured && <span className="mrow__badge">{t('houseFavorite')}</span>}
          {product.is86ed && <span className="mrow__chip">{t('soldOut')}</span>}
        </p>

        {showSecondary && (
          <p className="mrow__gloss" lang={locale === 'en' ? 'es' : 'en'}>
            {secondary}
          </p>
        )}

        {product.description && (
          <p className="mrow__desc" data-expanded={expanded || undefined}>
            {product.description}
          </p>
        )}
        {product.description && product.description.length > 90 && (
          <button
            type="button"
            className="mrow__more"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t('less') : t('more')}
          </button>
        )}

        {product.availableFrom && (
          <p className="mrow__oven">
            {t('fromOven', { time: product.availableFrom.slice(0, 5) })}
          </p>
        )}

        {/* Dietary tags come from the client in writing. Never inferred,
            so this list is empty until they send them. */}
        {product.dietaryTags.length > 0 && (
          <ul className="mrow__tags">
            {product.dietaryTags.map((tag) => (
              <li key={tag} className="mrow__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mrow__side">
        {product.variants.length > 1 && (
          <>
            <label className="visually-hidden" htmlFor={`v-${product.id}`}>
              {product.name}
            </label>
            <select
              id={`v-${product.id}`}
              className="mrow__select"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              disabled={product.is86ed}
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </>
        )}

        {variant && (
          <p className="mrow__price tabular" data-provisional="true">
            {formatMoney(variant.priceCents, locale)}
            <span className="visually-hidden"> — {t('priceProvisional')}</span>
          </p>
        )}
      </div>
    </li>
  )
}
