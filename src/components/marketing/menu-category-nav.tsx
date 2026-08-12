'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Sticky category pills with scroll-spy.
 *
 * Clicking scrolls to the section; `scroll-margin-top` on the section
 * clears both the header and this bar, so the heading is never tucked
 * underneath. The observer only reads `isIntersecting`, never layout.
 */
export function MenuCategoryNav({
  categories,
}: {
  categories: { id: string; slug: string; name: string }[]
}) {
  const t = useTranslations('menu')
  const [active, setActive] = useState(categories[0]?.slug ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries.filter((e) => e.isIntersecting)
        if (onScreen.length) {
          setActive(onScreen[0].target.id.replace(/^cat-/, ''))
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )

    for (const c of categories) {
      const el = document.getElementById(`cat-${c.slug}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [categories])

  return (
    <nav className="mnav" aria-label={t('categoryHeading')}>
      <ul className="mnav__list">
        {categories.map((c) => (
          <li key={c.id}>
            <a
              href={`#cat-${c.slug}`}
              className="mnav__pill"
              aria-current={c.slug === active ? 'true' : undefined}
            >
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
