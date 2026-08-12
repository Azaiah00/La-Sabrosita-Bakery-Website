'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toggleEightySix, unEightySixAll } from '@/app/actions/portal'
import type { MenuCategory } from '@/lib/data/types'

/**
 * The 86 board.
 *
 * Every active product as a big toggle, grouped by counter, searchable.
 * Flipping one writes `is_86ed` and revalidates the public menu, so the
 * item is gone from the customer's view on their next request.
 *
 * The toggle is optimistic — a baker tapping this at 6 AM should not
 * wait on a round trip — but it reconciles against the server response
 * and rolls back if the write is refused.
 */
export function EightySixBoard({ categories }: { categories: MenuCategory[] }) {
  const t = useTranslations('portal')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})

  const is86 = (id: string, actual: boolean) => optimistic[id] ?? actual

  function toggle(productId: string, next: boolean) {
    setOptimistic((o) => ({ ...o, [productId]: next }))
    startTransition(async () => {
      try {
        await toggleEightySix(productId, next)
        router.refresh()
      } catch {
        setOptimistic((o) => {
          const { [productId]: _dropped, ...rest } = o
          return rest
        })
      }
    })
  }

  const needle = query.trim().toLowerCase()
  const visible = categories
    .map((c) => ({
      ...c,
      products: c.products.filter(
        (p) =>
          !needle ||
          p.nameEs.toLowerCase().includes(needle) ||
          p.nameEn.toLowerCase().includes(needle),
      ),
    }))
    .filter((c) => c.products.length > 0)

  const offCount = categories
    .flatMap((c) => c.products)
    .filter((p) => is86(p.id, p.is86ed)).length

  return (
    <div className="board">
      <div className="board__bar">
        <label className="visually-hidden" htmlFor="board-search">
          {t('search86')}
        </label>
        <input
          id="board-search"
          type="search"
          className="board__search"
          placeholder={t('search86')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="board__count" aria-live="polite">
          {t('offCount', { count: offCount })}
        </p>
        {/* Used every morning. */}
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending || offCount === 0}
          onClick={() => {
            if (!confirm(t('confirmUnAll'))) return
            setOptimistic({})
            startTransition(async () => {
              await unEightySixAll()
              router.refresh()
            })
          }}
        >
          {t('unAll')}
        </button>
      </div>

      {visible.map((category) => (
        <section key={category.id} className="board__group" aria-labelledby={`b-${category.slug}`}>
          <h2 id={`b-${category.slug}`} className="board__heading">
            {category.name}
          </h2>
          <ul className="board__list">
            {category.products.map((p) => {
              const off = is86(p.id, p.is86ed)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="board__toggle"
                    aria-pressed={off}
                    disabled={pending}
                    onClick={() => toggle(p.id, !off)}
                  >
                    <span className="board__name" lang="es">
                      {p.nameEs}
                    </span>
                    <span className="board__state">
                      {off ? t('soldOut') : t('available')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
