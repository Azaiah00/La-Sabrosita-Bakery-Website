'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from './use-reduced-motion'

type Variant = 'chamber' | 'plate'

/**
 * Chamber reveal and card "plating" — DESIGN.md §7.
 *
 * chamber: opacity 0→1, y 24px→0, 600ms power2.out, 60ms stagger
 * plate:   y 12px→0 + scale .985→1, 480ms — the card settles like a
 *          plate set down on a counter
 *
 * The content is ALREADY in the DOM and already styled; this only moves
 * it. Under reduced motion the effect never runs and the final state is
 * what was server-rendered, so there is nothing to "resolve".
 */
export function Reveal({
  children,
  variant = 'chamber',
  stagger = 0.06,
  className,
}: {
  children: ReactNode
  variant?: Variant
  stagger?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || !ref.current) return
    const el = ref.current
    let cleanup: (() => void) | undefined
    let cancelled = false

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return
      gsap.registerPlugin(ScrollTrigger)

      const targets = el.dataset.revealChildren
        ? Array.from(el.children)
        : [el]

      const from =
        variant === 'plate'
          ? { opacity: 0, y: 12, scale: 0.985 }
          : { opacity: 0, y: 24 }

      const tween = gsap.from(targets, {
        ...from,
        duration: variant === 'plate' ? 0.48 : 0.6,
        ease: 'power2.out',
        stagger,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      })

      cleanup = () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        gsap.set(targets, { clearProps: 'opacity,transform' })
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [reduced, variant, stagger])

  return (
    <div ref={ref} className={className} data-reveal-children={stagger ? '' : undefined}>
      {children}
    </div>
  )
}
