import { getTranslations } from 'next-intl/server'
import { formatMoney } from '@/lib/money'
import type { Locale, Product } from '@/lib/data/types'

/**
 * DESIGN.md §6 — product card.
 *
 * --radius-lg, --surface, 1px --line. 4:3 image, name in display 500,
 * description in --t-small --ink-muted clamped to two lines, price
 * bottom-right with tabular numerals. An 86'd item renders at 55%
 * opacity with a --danger chip.
 *
 * NO PRODUCT PHOTOGRAPHY EXISTS YET. CLAUDE.md forbids stock or
 * AI-generated imagery for anything a customer can order, so the image
 * slot renders a typographic plate built from tokens instead — visibly
 * not a photograph, and labelled as pending. The real <Image> drops into
 * the same 4:3 box the moment the shot list in docs/ASSET-BRIEF.md comes
 * back, with no layout shift. Alt text is already authored in both
 * languages on `Product`.
 */
export async function ProductCard({
  product,
  locale,
}: {
  product: Product
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'menu' })
  const demo = await getTranslations({ locale, namespace: 'demo' })

  const priced = product.variants.find((v) => v.isDefault) ?? product.variants[0]
  const gloss = product.nameEn !== product.nameEs ? product.nameEn : null

  return (
    <article className="pcard" data-sold-out={product.is86ed || undefined}>
      <div className="pcard__media">
        {product.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- replaced by next/image with the real asset
          <img
            src={product.heroImage.url}
            alt={product.heroImage.alt}
            width={product.heroImage.width ?? 800}
            height={product.heroImage.height ?? 600}
            className="pcard__img"
            loading="lazy"
          />
        ) : (
          <div className="pcard__plate" role="img" aria-label={product.name}>
            <span className="pcard__plate-glyph" aria-hidden="true">
              {product.nameEs.charAt(0)}
            </span>
            <span className="pcard__plate-note">{demo('photoPending')}</span>
          </div>
        )}
        {product.is86ed && <span className="pcard__chip">{t('soldOut')}</span>}
      </div>

      <div className="pcard__body">
        <h3 className="pcard__name" lang="es">
          {product.nameEs}
        </h3>
        {gloss && (
          <p className="pcard__gloss" lang="en">
            {gloss}
          </p>
        )}
        {product.description && <p className="pcard__desc">{product.description}</p>}

        {priced && (
          <p className="pcard__price tabular" data-provisional="true">
            {formatMoney(priced.priceCents, locale)}
            <span className="visually-hidden"> — {t('priceProvisional')}</span>
          </p>
        )}
      </div>
    </article>
  )
}
