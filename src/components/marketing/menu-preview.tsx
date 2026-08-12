'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { formatMoney } from '@/lib/money'
import type { Locale, MenuCategory } from '@/lib/data/types'

/**
 * DESIGN.md §5 chamber 5 / §7 — tabbed preview across the six
 * categories, four items each, with a Framer Motion `layoutId` underline
 * on the active tab (240ms spring).
 *
 * The panels are all rendered server-side and hidden with `hidden`, so
 * every product name and price is in the HTML for search engines and the
 * tabs work as a progressive enhancement rather than a data fetch.
 */
export function MenuPreview({
  categories,
  locale,
  soldOutLabel,
}: {
  categories: MenuCategory[]
  locale: Locale
  soldOutLabel: string
}) {
  const [active, setActive] = useState(categories[0]?.slug ?? '')

  return (
    <div className="mpreview">
      <div className="mpreview__tabs" role="tablist">
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            role="tab"
            id={`mp-tab-${c.slug}`}
            aria-selected={c.slug === active}
            aria-controls={`mp-panel-${c.slug}`}
            className="mpreview__tab"
            onClick={() => setActive(c.slug)}
          >
            {c.name}
            {c.slug === active && (
              <motion.span
                layoutId="mpreview-underline"
                className="mpreview__underline"
                transition={{ type: 'spring', duration: 0.24, bounce: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {categories.map((c) => (
        <div
          key={c.slug}
          role="tabpanel"
          id={`mp-panel-${c.slug}`}
          aria-labelledby={`mp-tab-${c.slug}`}
          hidden={c.slug !== active}
          className="mpreview__panel"
        >
          <ul className="mpreview__list">
            {c.products.slice(0, 4).map((p) => {
              const priced = p.variants.find((v) => v.isDefault) ?? p.variants[0]
              return (
                <li key={p.id} className="mpreview__row" data-sold-out={p.is86ed || undefined}>
                  <span className="mpreview__name" lang="es">
                    {p.nameEs}
                    {p.is86ed && <span className="mpreview__chip">{soldOutLabel}</span>}
                  </span>
                  {priced && (
                    <span className="mpreview__price tabular" data-provisional="true">
                      {formatMoney(priced.priceCents, locale)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
