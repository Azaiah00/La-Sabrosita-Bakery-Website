import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ChamberTone = 'paper' | 'paper-alt' | 'dark' | 'wheat'

/**
 * DESIGN.md §5 — the chamber system.
 *
 * The page is a stack of rounded objects set on a counter, not strips of
 * a scrolling page. Full-bleed band, 2px ink border, --radius-xl on
 * mobile and --radius-2xl above.
 *
 * `tone="dark"` sets data-theme="dark" on the wrapper, so every token
 * inside flips automatically and no child needs to know it is in a dark
 * room. Never place two dark chambers adjacent.
 */
export function Chamber({
  tone,
  id,
  className,
  children,
  labelledBy,
}: {
  tone: ChamberTone
  id?: string
  className?: string
  children: ReactNode
  labelledBy?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-theme={tone === 'dark' ? 'dark' : undefined}
      data-tone={tone}
      className={cn('chamber', className)}
    >
      <div className="chamber__inner">{children}</div>
    </section>
  )
}
