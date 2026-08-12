import { fromCents } from '@/lib/money'
import type { Locale, MenuCategory } from '@/lib/data/types'

/**
 * Menu / MenuSection / MenuItem structured data.
 *
 * Two rules that are not negotiable:
 *   - `suitableForDiet` is emitted ONLY where the client has confirmed a
 *     dietary tag in writing. Never inferred from an ingredient list.
 *   - NO `nutrition` block at all, until the bakery provides lab or
 *     recipe-derived values in writing. An invented calorie count is a
 *     health claim.
 */
export function menuJsonLd({
  categories,
  locale,
  name,
  url,
}: {
  categories: MenuCategory[]
  locale: Locale
  name: string
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name,
    url,
    inLanguage: locale === 'es' ? 'es-US' : 'en-US',
    hasMenuSection: categories.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: category.products.map((product) => {
        const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0]
        return {
          '@type': 'MenuItem',
          // The Spanish name is the name. The English is a gloss.
          name: product.nameEs,
          ...(product.nameEn !== product.nameEs ? { alternateName: product.nameEn } : {}),
          ...(product.description ? { description: product.description } : {}),
          ...(product.heroImage ? { image: product.heroImage.url } : {}),
          ...(product.dietaryTags.length
            ? { suitableForDiet: product.dietaryTags }
            : {}),
          ...(variant
            ? {
                offers: {
                  '@type': 'Offer',
                  price: fromCents(variant.priceCents).toFixed(2),
                  priceCurrency: 'USD',
                  availability: product.is86ed
                    ? 'https://schema.org/SoldOut'
                    : 'https://schema.org/InStock',
                },
              }
            : {}),
        }
      }),
    })),
  }
}
