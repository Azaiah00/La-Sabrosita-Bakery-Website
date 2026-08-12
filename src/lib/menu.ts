import { db } from '@/lib/data'
import type { Locale, MenuCategory, Product } from '@/lib/data/types'
import { businessDate } from '@/lib/datetime'

/**
 * Fold a string for searching: lowercase, strip diacritics, collapse
 * whitespace. `Quesadilla Salvadoreña` and `quesadilla salvadorena` are
 * the same needle — a shopper standing at the counter is not going to
 * reach for the ñ key.
 */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein, capped — we only care whether it is 0, 1, or "more". */
function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = row
    if (Math.min(...row) > max) return max + 1
  }
  return prev[b.length]
}

/**
 * Does this haystack match the query?
 *
 * Substring first, then a one-edit tolerance per word so `quesadila`
 * still finds the quesadilla. Both sides are already folded.
 */
export function matches(haystack: string, query: string): boolean {
  if (!query) return true
  if (haystack.includes(query)) return true
  if (query.length < 5) return false
  return haystack
    .split(' ')
    .some((word) => word.length >= 4 && editDistance(word, query) <= 1)
}

/** Everything a row can be found by, folded once at render time. */
export function searchIndexFor(product: Product): string {
  return fold(
    [
      product.nameEs,
      product.nameEn,
      product.description ?? '',
      ...product.variants.map((v) => `${v.label} ${v.sku}`),
    ].join(' '),
  )
}

/**
 * The menu, resolved for a locale and filtered for today.
 *
 * Seasonal products are filtered against today's business date in
 * America/New_York. Time-windowed products (conchas at 07:00) still
 * render with a note — someone browsing at 6 AM wants to know they are
 * coming, not that they are gone.
 *
 * AN 86'd PRODUCT IS REMOVED HERE, not dimmed. Two governing documents
 * require it — PROMPT-00's acceptance criteria ("86'ing a product in the
 * portal removes it from the public menu on refresh") and RUN-ORDER's
 * checkpoint ("refresh /es/menu → it's gone"). DESIGN.md §6's 55%-opacity
 * treatment with the "Se acabó por hoy" chip still applies to the PRODUCT
 * CARD component, which is what the home page uses — so both specs hold,
 * each on the surface it actually describes.
 *
 * The data layer still reports the truth (`is86ed`); this is a
 * presentation decision and it lives in exactly one place.
 */
export async function getMenu(locale: Locale): Promise<MenuCategory[]> {
  const categories = await db.getMenu(locale)
  const today = businessDate(new Date())

  return categories
    .map((category) => ({
      ...category,
      products: category.products.filter(
        (p) => inSeason(p, today) && !p.is86ed,
      ),
    }))
    .filter((category) => category.products.length > 0)
}

function inSeason(product: Product, today: string): boolean {
  // The demo fixtures carry no seasonal window; the filter is here so a
  // Rosca de Reyes added in January disappears in February on its own.
  const seasonal = product as Product & { seasonStart?: string | null; seasonEnd?: string | null }
  if (!seasonal.seasonStart || !seasonal.seasonEnd) return true
  return today >= seasonal.seasonStart && today <= seasonal.seasonEnd
}

/**
 * Menu engineering — the top two slots in every section go to the
 * highest contribution margin, then everything else falls back to
 * sort_order.
 *
 * Contribution margin is price minus food cost per unit, in cents. A
 * product with no recipe has no known cost and cannot be ranked, so it
 * keeps its natural position rather than being promoted on a guess.
 */
export async function engineerSections(
  categories: MenuCategory[],
): Promise<Map<string, { featuredId: string | null; order: string[] }>> {
  const margins = await db.getMarginTable()
  const contributionByProduct = new Map<string, number>()

  for (const category of categories) {
    for (const product of category.products) {
      const best = product.variants
        .map((v) => {
          const row = margins.find((m) => m.variantId === v.id)
          if (!row || row.foodCost === null) return null
          return v.priceCents - Math.round(row.foodCost * 100)
        })
        .filter((n): n is number => n !== null)
      if (best.length) contributionByProduct.set(product.id, Math.max(...best))
    }
  }

  const result = new Map<string, { featuredId: string | null; order: string[] }>()

  for (const category of categories) {
    const ranked = [...category.products].sort((a, b) => {
      const ca = contributionByProduct.get(a.id)
      const cb = contributionByProduct.get(b.id)
      if (ca !== undefined && cb !== undefined && ca !== cb) return cb - ca
      if (ca !== undefined && cb === undefined) return -1
      if (ca === undefined && cb !== undefined) return 1
      return a.sortOrder - b.sortOrder
    })

    const top = ranked.slice(0, 2).map((p) => p.id)
    const rest = category.products
      .filter((p) => !top.includes(p.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id)

    // Exactly one "house favourite" per section: the highest-margin item
    // that ALSO has a real photograph. No photography exists yet, so no
    // badge renders — it lights up on its own when the shots land.
    const featured =
      ranked.find((p) => p.heroImage !== null && contributionByProduct.has(p.id))?.id ?? null

    result.set(category.id, { featuredId: featured, order: [...top, ...rest] })
  }

  return result
}

/** Dietary tags actually present in the data. Never inferred. */
export function presentDietaryTags(categories: MenuCategory[]): string[] {
  const tags = new Set<string>()
  for (const c of categories) for (const p of c.products) for (const t of p.dietaryTags) tags.add(t)
  return [...tags].sort()
}
