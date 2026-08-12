'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './use-reduced-motion'

/**
 * The proof-chamber count-up — DESIGN.md §7, once, 1.2s.
 *
 * The final value is server-rendered as the initial state, so the figure
 * is in the HTML for search engines and for anyone whose JS never runs.
 * The animation rewinds to zero and plays forward only when it is both
 * on screen and motion is welcome.
 */
export function CountUp({
  value,
  decimals = 0,
  locale,
  className,
}: {
  value: number
  decimals?: number
  locale: 'es' | 'en'
  className?: string
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (reduced || !ref.current) return
    const el = ref.current

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()

        const start = performance.now()
        const duration = 1200
        let frame = 0

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          // power2.out, to match every other move on the page.
          const eased = 1 - Math.pow(1 - t, 2)
          setDisplay(value * eased)
          if (t < 1) frame = requestAnimationFrame(tick)
          else setDisplay(value)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced, value])

  const formatted = new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display)

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  )
}
