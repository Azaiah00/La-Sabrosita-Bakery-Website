import type { Locale } from '@/lib/data/types'

/**
 * A customer review, quoted verbatim.
 *
 * CLAUDE.md and DESIGN.md §11: never invent, paraphrase, translate or
 * embellish a review. These are English originals, so they carry
 * lang="en" even on the Spanish page — a translated review is a
 * fabricated review, and marking the language is what lets a screen
 * reader pronounce it correctly instead of reading English through a
 * Spanish voice.
 */
export interface Review {
  quote: string
  source: string
  author?: string
  date?: string
}

/** The only three approved until the client signs off on more. */
export const APPROVED_REVIEWS: Review[] = [
  {
    quote: 'Great prices, delicious food, and it felt like family there!',
    source: 'Google',
  },
  {
    quote:
      "Got my wife's tres leches birthday cake from them. Very affordable, beautifully decorated and delicious.",
    source: 'Google',
    author: 'Ricky Magner',
  },
  {
    quote: 'The cake was phenomenal, moist, and beautiful.',
    source: 'Tripadvisor',
    date: 'Nov 2024',
  },
]

export function ReviewQuote({ review, locale }: { review: Review; locale: Locale }) {
  const attribution = [review.author, review.source, review.date].filter(Boolean).join(' · ')

  return (
    <figure className="review">
      <blockquote className="review__quote" lang="en">
        {/* Quoted exactly as written. Not translated on /es, by design. */}
        <p>{review.quote}</p>
      </blockquote>
      <figcaption className="review__cite">
        {attribution}
        {locale === 'es' && (
          <span className="visually-hidden"> — reseña original en inglés</span>
        )}
      </figcaption>
    </figure>
  )
}
