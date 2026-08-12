import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/data'
import { formatWallTime, businessDate } from '@/lib/datetime'
import type { Locale } from '@/lib/data/types'

/**
 * "Open today 7:00 AM – 8:00 PM" / "Closed today", computed server-side
 * from `opening_hours` for today's date in America/New_York. Never
 * hard-coded — and it genuinely says closed when the bakery is closed.
 *
 * The hours themselves are still a placeholder: four published sources
 * disagree and Google's set is seeded as the least-wrong default. The
 * data layer flags that, and this renders the flag.
 */
export async function OpenStatus({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations({ locale, namespace: 'hours' })

  const now = new Date()
  const status = await db.getTodayStatus(now)
  const week = await db.getWeekHours()
  const today = week.find((w) => w.dow === new Date(businessDate(now) + 'T00:00:00Z').getUTCDay())

  let label: string
  if (status.isOpen && today) {
    label = t('openToday', {
      opens: formatWallTime(today.opensAt, locale),
      closes: formatWallTime(today.closesAt, locale),
    })
  } else if (status.opensAt && status.opensOn === businessDate(now)) {
    label = t('openToday', {
      opens: formatWallTime(status.opensAt, locale),
      closes: today ? formatWallTime(today.closesAt, locale) : '',
    })
  } else {
    label = t('closedToday')
  }

  return (
    <span className={className} data-provisional={status.isProvisional || undefined}>
      {label}
    </span>
  )
}
