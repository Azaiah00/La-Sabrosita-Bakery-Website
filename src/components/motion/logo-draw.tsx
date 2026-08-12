'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from './use-reduced-motion'

const SESSION_KEY = 'ls-logo-drawn'

/**
 * The signature move — DESIGN.md §7.
 *
 * Uses the real raster logo provided by the client.
 * Fades and scales in on first load.
 */
export function LogoDraw({
  size = 40,
  animate = false,
  className,
}: {
  size?: number
  /** Only the header mark opts in. The divider glyph is static. */
  animate?: boolean
  className?: string
}) {
  const ref = useRef<HTMLImageElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!animate || reduced || !ref.current) return
    if (sessionStorage.getItem(SESSION_KEY)) return

    const img = ref.current
    let cancelled = false
    let cleanup: (() => void) | undefined

    void (async () => {
      const { gsap } = await import('gsap')
      if (cancelled) return

      sessionStorage.setItem(SESSION_KEY, '1')

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from(img, { opacity: 0, scale: 0.8, transformOrigin: '50% 50%', duration: 0.6 })

      cleanup = () => tl.kill()
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [animate, reduced])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/brand/logo-mark.png"
      alt="La Sabrosita Bakery"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ borderRadius: '50%', objectFit: 'contain' }}
    />
  )
}
