import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/data'
import { formatWallTime, businessDate } from '@/lib/datetime'
import type { Locale } from '@/lib/data/types'

/** The full week, straight from the data layer, with today marked. */
export async function HoursTable({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'hours' })
  const week = await db.getWeekHours()
  const todayDow = new Date(businessDate(new Date()) + 'T00:00:00Z').getUTCDay()

  return (
    <div className="hours">
      <table className="hours__table">
        <caption className="visually-hidden">{t('heading')}</caption>
        <tbody>
          {week.map((row) => (
            <tr key={row.dow} data-today={row.dow === todayDow || undefined}>
              <th scope="row" className="hours__day">
                {t(`days.${row.dow}` as 'days.0')}
                {row.dow === todayDow && (
                  <span className="hours__badge">{t('today')}</span>
                )}
              </th>
              <td className="hours__time tabular">
                {formatWallTime(row.opensAt, locale)} – {formatWallTime(row.closesAt, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Four published sources disagree. Nothing here ships unconfirmed. */}
      <p className="hours__note">{t('provisional')}</p>
    </div>
  )
}
