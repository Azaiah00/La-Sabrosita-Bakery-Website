import { fromCents } from '@/lib/money'
import type { CakeSize, Locale } from '@/lib/data/types'
import { priceRange } from '@/lib/cakes'

/**
 * Product + BreadcrumbList for a cake page.
 *
 * NOTE the deliberate omission: no `aggregateRating`. The 4.3 / 663
 * rating belongs to the BUSINESS, not to a specific cake. Attaching it
 * to a Product node is a structured-data violation and Google issues
 * manual actions for it.
 *
 * There is no `nutrition` block either, for the same reason as the menu.
 */
export function cakeProductJsonLd({
  name,
  description,
  sizes,
  url,
  image,
}: {
  name: string
  description: string
  sizes: CakeSize[]
  url: string
  image?: string
}) {
  const { low, high } = priceRange(sizes)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    ...(image ? { image } : {}),
    brand: { '@type': 'Brand', name: 'La Sabrosita Bakery' },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: fromCents(low).toFixed(2),
      highPrice: fromCents(high).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      offerCount: sizes.length,
    },
  }
}

export function breadcrumbJsonLd({
  locale,
  base,
  trail,
}: {
  locale: Locale
  base: string
  trail: { name: string; path: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${base}/${locale}${item.path}`,
    })),
  }
}
