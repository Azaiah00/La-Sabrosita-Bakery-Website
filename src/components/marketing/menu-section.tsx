import { MenuRow } from './menu-row'
import type { Locale, MenuCategory } from '@/lib/data/types'

/**
 * One category as a landmark section with its own heading, so a screen
 * reader can jump between counters the way a shopper walks past them.
 */
export function MenuSection({
  category,
  locale,
  order,
  featuredId,
}: {
  category: MenuCategory
  locale: Locale
  order?: string[]
  featuredId?: string | null
}) {
  const products = order
    ? order
        .map((id) => category.products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : category.products

  return (
    <section
      id={`cat-${category.slug}`}
      data-menu-section=""
      aria-labelledby={`cath-${category.slug}`}
      className="msection"
    >
      <h2 id={`cath-${category.slug}`} className="msection__heading">
        {category.name}
      </h2>
      <ul className="msection__list">
        {products.map((p) => (
          <MenuRow
            key={p.id}
            product={p}
            locale={locale}
            featured={featuredId === p.id}
          />
        ))}
      </ul>
    </section>
  )
}
