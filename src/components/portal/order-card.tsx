'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Phone } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { advanceOrderStatus } from '@/app/actions/portal'
import type { Locale, Order, OrderStatus } from '@/lib/data/types'

const FLOW: OrderStatus[] = ['confirmed', 'in_production', 'decorating', 'ready', 'completed']

/**
 * One order in the queue.
 *
 * The allergy note is NEVER truncated and never behind a tap. If it
 * exists it renders in full, in danger colours, with an icon — someone
 * reading this card is about to hand over food.
 *
 * Status advances through a segmented control, not a modal. A routine
 * status change happens dozens of times a shift and a dialog each time
 * would be intolerable.
 */
export function OrderCard({
  order,
  locale,
  canWrite,
}: {
  order: Order
  locale: Locale
  canWrite: boolean
}) {
  const t = useTranslations('portal')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const time = order.pickupAt
    ? new Date(order.pickupAt).toLocaleTimeString(locale === 'es' ? 'es-US' : 'en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—'

  function setStatus(next: OrderStatus) {
    startTransition(async () => {
      await advanceOrderStatus(order.id, next)
      router.refresh()
    })
  }

  return (
    <article className="ocard" data-type={order.orderType}>
      <div className="ocard__top">
        <p className="ocard__time tabular">{time}</p>
        <span className="ocard__badge">{t(`type_${order.orderType}`)}</span>
        <span className="chip" data-status={order.status}>
          {t(`status_${order.status}`)}
        </span>
      </div>

      <p className="ocard__name">{order.contactName}</p>

      <p className="ocard__meta">
        <a href={`tel:${order.contactPhone.replace(/[^\d+]/g, '')}`} className="ocard__phone">
          <Phone aria-hidden="true" />
          {order.contactPhone}
        </a>
        <span className="tabular">
          {t('itemCount', { count: order.items.length })} · {formatMoney(order.totalCents, locale)}
        </span>
        {order.amountPaidCents >= order.totalCents && order.totalCents > 0 ? (
          <span className="ocard__paid">{t('paid')}</span>
        ) : order.amountPaidCents > 0 ? (
          <span className="ocard__paid">
            {t('deposit', { amount: formatMoney(order.amountPaidCents, locale) })}
          </span>
        ) : (
          <span className="ocard__unpaid">{t('unpaid')}</span>
        )}
      </p>

      {/* Never truncated, never collapsed. */}
      {order.allergyNote && (
        <p className="ocard__allergy">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>{t('allergy')}:</strong> {order.allergyNote}
          </span>
        </p>
      )}

      {order.customerNote && <p className="ocard__note">{order.customerNote}</p>}

      {canWrite && (
        <div className="ocard__flow" role="group" aria-label={t('advance')}>
          {FLOW.map((s) => (
            <button
              key={s}
              type="button"
              className="ocard__step"
              aria-pressed={order.status === s}
              disabled={pending}
              onClick={() => setStatus(s)}
            >
              {t(`status_${s}`)}
            </button>
          ))}
        </div>
      )}

      <p className="ocard__more">
        <Link href={`/portal/pedidos/${order.id}`}>{t('openOrder', { number: order.orderNumber })}</Link>
      </p>
    </article>
  )
}
