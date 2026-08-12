import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale, MenuCategory, Product } from '@/lib/data/types'

/**
 * Menu row, list density — DESIGN.md §6.
 *
 * Spanish name in display 500; the English gloss sits beneath it and is
 * never the primary label. Price right-aligned and tabular. No leader
 * dots, and prices are deliberately NOT aligned into a scannable column:
 * guests should read the food first.
 *
 * Every price carries its provisional treatment. The client's published
 * prices run roughly 50% of current reality and none of them ship until
 * they are re-quoted — showing that the system refuses to publish an
 * unconfirmed price is a selling point, not a blemish.
 */

function MenuRow({ product, locale, t }: {
  product: Product
  locale: Locale
  t: Awaited<ReturnType<typeof getTranslations<'menu'>>>
}) {
  const variants = product.variants
  const gloss = locale === 'en' && product.nameEn !== product.nameEs ? product.nameEn : null

  return (
    <li className="menu-row" data-sold-out={product.is86ed || undefined}>
      <div className="menu-row__body">
        <p className="menu-row__name" lang="es">
          {product.nameEs}
          {product.is86ed && (
            <span className="menu-row__chip">{t('soldOut')}</span>
          )}
        </p>
        {gloss && <p className="menu-row__gloss">{gloss}</p>}
        {product.description && <p className="menu-row__desc">{product.description}</p>}
        {product.availableFrom && (
          <p className="menu-row__oven">
            {t('fromOven', { time: product.availableFrom.slice(0, 5) })}
          </p>
        )}
      </div>

      <ul className="menu-row__prices">
        {variants.map((v) => (
          <li key={v.id} className="menu-row__price-item">
            <span className="menu-row__label">{v.label}</span>
            <span className="menu-row__price tabular" data-provisional="true">
              {formatMoney(v.priceCents, locale)}
              <span className="visually-hidden"> — {t('priceProvisional')}</span>
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}

export async function MenuList({
  categories,
  locale,
}: {
  categories: MenuCategory[]
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'menu' })

  return (
    <div className="menu">
      {categories.map((category) => (
        <section key={category.id} className="menu-section" aria-labelledby={`cat-${category.slug}`}>
          <h2 id={`cat-${category.slug}`} className="menu-section__heading">
            {category.name}
          </h2>
          {category.products.length === 0 ? (
            <p className="menu-section__empty">{t('empty')}</p>
          ) : (
            <ul className="menu-section__list">
              {category.products.map((p) => (
                <MenuRow key={p.id} product={p} locale={locale} t={t} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
