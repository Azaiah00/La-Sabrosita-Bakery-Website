'use server'

import { db, IS_DEMO } from '@/lib/data'
import type { Locale } from '@/lib/data/types'
import { getDepositPolicy } from '@/lib/cakes'
import { send } from '@/lib/notifications/send'
import {
  orderConfirmedEmail,
  cakeConfirmedEmail,
  orderConfirmedSms,
} from '@/lib/notifications/templates'
import { formatLocal, formatWallTime } from '@/lib/datetime'

/**
 * The demo stand-in for a cleared payment.
 *
 * NOTHING IS CHARGED. This advances the order to `confirmed` and then —
 * and only then — composes the confirmation. An order is never
 * confirmed and no message is ever composed before payment clears; in
 * production this same code runs from the Stripe webhook rather than
 * from a button.
 *
 * The message goes through `send()`, so the opt-in, quiet-hours and
 * idempotency rules apply exactly as they will in production. In demo
 * mode it lands in the Mensajes drawer and nothing leaves the machine.
 */
export async function payDemoOrder(orderId: string, locale: Locale) {
  if (!IS_DEMO) throw new Error('The demo payment route is not available in this build')

  const order = await db.setOrderStatus(orderId, 'confirmed')
  const now = new Date()
  const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale}/pedido/${order.orderNumber}`

  if (order.orderType === 'cake') {
    const [policy, sizes, options] = await Promise.all([
      getDepositPolicy(),
      db.getCakeSizes(),
      db.getCakeOptions(),
    ])

    // The specification as the customer configured it. The inscription
    // is quoted back so it can be corrected before the cake is made —
    // getting `Felices 15, Sofía` wrong is the most common custom-cake
    // failure there is.
    const spec = {
      sizeLabel: sizes[0]?.label ?? '',
      servings: sizes[0]?.servingsMax ?? 0,
      tiers: 1,
      inscription: order.customerNote,
      colorNotes: null,
      flavor: options.find((o) => o.optionGroup === 'flavor')?.label,
    }

    const email = cakeConfirmedEmail(order, spec, locale, magicLink, {
      fullHours: policy.cancelFullRefundHours,
      partialHours: policy.cancelPartialRefundHours,
      partialPct: policy.partialRefundPct,
    })

    await send(
      {
        templateKey: 'cake_confirmed',
        channel: 'email',
        locale,
        toAddress: order.contactEmail ?? order.contactPhone,
        orderId: order.id,
        now,
      },
      { subject: email.subject, body: email.html },
    )
  } else {
    const email = orderConfirmedEmail(order, locale, magicLink)
    await send(
      {
        templateKey: 'order_confirmed',
        channel: 'email',
        locale,
        toAddress: order.contactEmail ?? order.contactPhone,
        orderId: order.id,
        now,
      },
      { subject: email.subject, body: email.html },
    )
  }

  /*
   * The SMS goes ONLY if consent was stamped at the point of collection.
   * No stamp, no text — `send()` refuses it and nothing is logged, so
   * the drawer shows exactly what would really have gone out.
   */
  const pickup = order.pickupAt
    ? formatWallTime(formatLocal(new Date(order.pickupAt), 'HH:mm'), locale)
    : ''

  await send(
    {
      templateKey: 'order_confirmed',
      channel: 'sms',
      locale,
      toAddress: order.contactPhone,
      orderId: order.id,
      smsOptInAt: order.smsOptInAt,
      now,
    },
    { body: orderConfirmedSms(order, locale, pickup) },
  )

  return { orderNumber: order.orderNumber, status: order.status }
}
