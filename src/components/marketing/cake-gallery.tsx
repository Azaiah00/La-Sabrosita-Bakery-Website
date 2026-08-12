import { getTranslations } from 'next-intl/server'
import { LogoDraw } from '@/components/motion/logo-draw'
import type { Locale } from '@/lib/data/types'

export interface GallerySlot {
  /** The shot this slot is waiting for, from docs/ASSET-BRIEF.md. */
  shot: string
  alt: string
  url?: string
}

/**
 * The cake gallery.
 *
 * REAL PHOTOGRAPHS ONLY. The client has none delivered yet, and
 * CLAUDE.md forbids filling the gap with stock or AI-generated cake
 * imagery — a customer ordering a quinceañera cake from a picture of
 * someone else's cake is exactly the misrepresentation that rule exists
 * to prevent.
 *
 * So each slot renders as a labelled placeholder naming the shot it is
 * waiting for. It is honest on the demo, it doubles as the shot list in
 * front of the client, and the real <Image> drops into the same box with
 * no layout shift.
 */
export async function CakeGallery({
  slots,
  locale,
}: {
  slots: GallerySlot[]
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'cakes' })

  return (
    <ul className="cgallery">
      {slots.map((slot) => (
        <li key={slot.shot} className="cgallery__item">
          {slot.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- swapped for next/image with the real asset
            <img src={slot.url} alt={slot.alt} className="cgallery__img" loading="lazy" />
          ) : (
            <div className="cgallery__plate" role="img" aria-label={slot.alt}>
              <LogoDraw size={48} />
              <span className="cgallery__pending">{t('photoPending')}</span>
              <span className="cgallery__shot">{slot.shot}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
