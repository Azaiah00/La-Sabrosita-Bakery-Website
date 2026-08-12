'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Dietary filter chips.
 *
 * Renders ONLY for tags that actually exist in the data. `dietary_tags`
 * is client-confirmed content and is empty until the bakery sends it in
 * writing, so today this component returns null and no filter appears —
 * which is correct. A dietary claim is never inferred from an ingredient
 * list, and an empty filter that implies we know something we do not is
 * worse than no filter.
 */
export function DietaryFilter({ tags }: { tags: string[] }) {
  const t = useTranslations('menu')
  const [active, setActive] = useState<string | null>(null)

  if (tags.length === 0) return null

  function apply(tag: string | null) {
    setActive(tag)
    for (const row of document.querySelectorAll<HTMLElement>('[data-menu-row]')) {
      const rowTags = (row.dataset.tags ?? '').split(' ').filter(Boolean)
      row.hidden = tag !== null && !rowTags.includes(tag)
    }
  }

  return (
    <div className="dfilter" role="group" aria-label={t('dietaryLabel')}>
      <button
        type="button"
        className="dfilter__chip"
        aria-pressed={active === null}
        onClick={() => apply(null)}
      >
        {t('allCategories')}
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="dfilter__chip"
          aria-pressed={active === tag}
          onClick={() => apply(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
