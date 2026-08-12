'use client'

import { useEffect } from 'react'
import { useReducedMotion } from './use-reduced-motion'

/**
 * Smooth scroll + scroll choreography.
 *
 * Lenis and GSAP are BOTH dynamically imported, inside an effect, after
 * paint. DESIGN.md §7 and §10: no motion-library work on the main thread
 * before LCP, and neither library may enter the initial bundle for a
 * route that does not animate.
 *
 * Under reduced motion Lenis is never initialized at all — native
 * scrolling is the correct behaviour, not a slowed-down imitation.
 */
export function ScrollProvider() {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    let lenis: import('lenis').default | null = null
    let frame = 0
    let cancelled = false

    void (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)

      lenis = new Lenis({ duration: 1.05, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)

      const raf = (time: number) => {
        lenis?.raf(time)
        frame = requestAnimationFrame(raf)
      }
      frame = requestAnimationFrame(raf)
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      lenis?.destroy()
    }
  }, [reduced])

  return null
}
