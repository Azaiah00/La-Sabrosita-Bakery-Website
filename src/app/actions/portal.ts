'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/data'
import { currentRole } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { routing } from '@/i18n/routing'
import { send } from '@/lib/notifications/send'
import { orderReadyEmail, orderReadySms } from '@/lib/notifications/templates'
import { formatLocal, formatWallTime } from '@/lib/datetime'
import type { Order, OrderStatus, WasteReason } from '@/lib/data/types'

/** Statuses a routine segmented control may set, in order. */
const FLOW: OrderStatus[] = [
  'confirmed',
  'in_production',
  'decorating',
  'ready',
  'completed',
]

/**
 * 86 a product, or put it back.
 *
 * Revalidates BOTH locale menus and their category pages, so the public
 * site reflects it on the next request rather than on the next ISR
 * window. This is the demo's best twenty seconds and it has to be
 * instant.
 */
export async function toggleEightySix(productId: string, value: boolean) {
  const role = await currentRole()
  if (!can(role, 'eightySix')) throw new Error('Not permitted')

  await db.setEightySixed(productId, value)
  revalidateMenus()
  return { ok: true as const }
}

export async function unEightySixAll() {
  const role = await currentRole()
  if (!can(role, 'eightySix')) throw new Error('Not permitted')

  const categories = await db.getMenu('es')
  for (const category of categories) {
    for (const product of category.products) {
      if (product.is86ed) await db.setEightySixed(product.id, false)
    }
  }
  revalidateMenus()
  return { ok: true as const }
}

function revalidateMenus() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/menu`, 'page')
    revalidatePath(`/${locale}/menu/[category]`, 'page')
    revalidatePath(`/${locale}`, 'page')
  }
  revalidatePath('/portal/menu-86', 'page')
}

/**
 * Advance an order.
 *
 * A status may never move backwards past `completed` without a manager.
 * A cancelled order releases its stock reservation — that happens inside
 * `setOrderStatus`, in the same mutation as the status write.
 */
export async function advanceOrderStatus(orderId: string, next: OrderStatus) {
  const role = await currentRole()
  if (!can(role, 'ordersWrite')) throw new Error('Not permitted')

  const order = await db.getOrder(orderId)
  if (!order) throw new Error('Unknown order')

  const currentIndex = FLOW.indexOf(order.status)
  const nextIndex = FLOW.indexOf(next)
  const movingBackwards = currentIndex > -1 && nextIndex > -1 && nextIndex < currentIndex

  if (order.status === 'completed' && movingBackwards && !can(role, 'admin')) {
    throw new Error('Reopening a completed order needs a manager')
  }

  const updated = await db.setOrderStatus(orderId, next)

  // "Your order is ready" is the one message the customer is waiting
  // for, so it fires here and it is exempt from quiet hours. Everything
  // else about it still applies — no SMS without stamped consent.
  if (next === 'ready') await notifyReady(updated)

  revalidatePath('/portal/pedidos', 'page')
  revalidatePath('/portal', 'page')
  return { ok: true as const }
}

async function notifyReady(order: Order) {
  const now = new Date()
  const locale = order.locale
  const week = await db.getWeekHours()
  const dow = order.pickupAt
    ? Number(formatLocal(new Date(order.pickupAt), 'i')) % 7
    : new Date().getUTCDay()
  const closing = week.find((h) => h.dow === dow)?.closesAt ?? '20:00'
  const closingLabel = formatWallTime(closing, locale)

  const email = orderReadyEmail(order, locale, closingLabel)
  await send(
    {
      templateKey: 'order_ready',
      channel: 'email',
      locale,
      toAddress: order.contactEmail ?? order.contactPhone,
      orderId: order.id,
      now,
    },
    { subject: email.subject, body: email.html },
  )

  await send(
    {
      templateKey: 'order_ready',
      channel: 'sms',
      locale,
      toAddress: order.contactPhone,
      orderId: order.id,
      smsOptInAt: order.smsOptInAt,
      now,
    },
    { body: orderReadySms(order, locale, closingLabel) },
  )
}

export async function logWasteEntry(formData: FormData) {
  const role = await currentRole()
  if (!can(role, 'waste')) throw new Error('Not permitted')

  const variantId = String(formData.get('variantId') ?? '')
  const qty = Number(formData.get('qty') ?? 0)
  const reason = String(formData.get('reason') ?? 'end_of_day') as WasteReason

  if (!variantId || !Number.isFinite(qty) || qty <= 0) {
    throw new Error('Pick a product and a quantity')
  }

  await db.logWaste({ variantId, qty, reason })
  revalidatePath('/portal/merma', 'page')
  revalidatePath('/portal', 'page')
}
