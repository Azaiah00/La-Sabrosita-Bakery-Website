'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/lib/data/types'

/**
 * A live clock in Richmond time.
 *
 * Rendered client-side after mount so the server's time never disagrees
 * with the browser's for a frame. The timezone is named on the label,
 * because a baker in the shop and an owner on a phone elsewhere must be
 * reading the same clock.
 */
export function PortalClock({ locale }: { locale: Locale }) {
  const t = useTranslations('portal')
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="portal-clock">
      <span className="portal-clock__time tabular">
        {now
          ? now.toLocaleTimeString(locale === 'es' ? 'es-US' : 'en-US', {
              timeZone: 'America/New_York',
              hour: 'numeric',
              minute: '2-digit',
            })
          : '—'}
      </span>
      <span className="portal-clock__zone">{t('richmondTime')}</span>
    </p>
  )
}
