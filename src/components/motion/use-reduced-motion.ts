'use client'

import { useEffect, useState } from 'react'

/**
 * `prefers-reduced-motion: reduce`, live.
 *
 * Starts `true` so nothing animates on the first paint before the query
 * has been read — under DESIGN.md §7 every move needs an off-ramp, and
 * the safe default is the off-ramp.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  return reduced
}
