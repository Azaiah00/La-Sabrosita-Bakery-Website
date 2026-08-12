'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { fold, matches } from '@/lib/menu'

/**
 * Search over the SERVER-RENDERED menu.
 *
 * This does not fetch, and it does not re-render the list — every row is
 * already in the HTML (which is the whole SEO point of this page). It
 * folds the query, walks `[data-menu-row]`, and hides what does not
 * match, collapsing any section that empties out.
 *
 * Matching is diacritic-insensitive with a one-edit tolerance, so
 * `quesadilla`, `Quesadilla Salvadoreña`, `cheese bread` and `quesadila`
 * all land on the same product.
 */
export function MenuSearch() {
  const t = useTranslations('menu')
  const [query, setQuery] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const inputId = useId()

  useEffect(() => {
    const needle = fold(query)
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-row]'))
    let visible = 0

    for (const row of rows) {
      const hay = row.dataset.search ?? ''
      const hit = matches(hay, needle)
      row.hidden = !hit
      if (hit) visible++
    }

    // A section with nothing left in it should not leave a heading behind.
    for (const section of document.querySelectorAll<HTMLElement>('[data-menu-section]')) {
      const anyVisible = Array.from(
        section.querySelectorAll<HTMLElement>('[data-menu-row]'),
      ).some((r) => !r.hidden)
      section.hidden = !anyVisible
    }

    setCount(needle ? visible : null)
  }, [query])

  return (
    <div className="msearch">
      <label className="visually-hidden" htmlFor={inputId}>
        {t('searchLabel')}
      </label>
      <div className="msearch__field">
        <Search className="msearch__icon" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          className="msearch__input"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="msearch__clear"
            aria-label={t('clearSearch')}
            onClick={() => setQuery('')}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="msearch__status" aria-live="polite">
        {count === null ? '' : t('searchResults', { count })}
      </p>
      {count === 0 && <p className="msearch__empty">{t('searchEmpty')}</p>}
    </div>
  )
}
