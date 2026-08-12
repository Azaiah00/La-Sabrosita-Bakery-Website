/* =====================================================================
   PROMPT-14 — every transactional template, both locales.
   ---------------------------------------------------------------------
   THE SPANISH IS WRITTEN FIRST. None of it is a machine translation of
   the English; where the two differ in rhythm, the Spanish is the one
   that reads naturally and the English follows it.

   Every SMS is under 160 characters IN BOTH LANGUAGES. Spanish runs
   15-20% longer, so the Spanish is the constraint and there is a test
   that measures it rather than trusting the eye.
   ===================================================================== */

import { EMAIL_PALETTE as C } from '@/lib/email-palette'
import { formatMoney } from '@/lib/money'
import { formatLocal, formatWallTime } from '@/lib/datetime'
import { BUSINESS } from '@/lib/constants'
import { emailLayout, emailButton, esc, DIRECTIONS_URL } from './layout'
import type { Locale, Order } from '@/lib/data/types'

export type TemplateKey =
  | 'order_confirmed'
  | 'cake_confirmed'
  | 'order_ready'
  | 'order_reminder'
  | 'order_cancelled'
  | 'review_request'
  | 'wholesale_welcome'
  | 'standing_order_notice'

export interface EmailBody {
  subject: string
  html: string
}

export interface CakeSpec {
  sizeLabel: string
  servings: number
  tiers: number
  flavor?: string
  filling?: string
  frosting?: string
  finish?: string
  inscription?: string | null
  colorNotes?: string | null
}

const firstName = (full: string) => full.trim().split(/\s+/)[0]

const pickupLine = (order: Order, locale: Locale) =>
  order.pickupAt
    ? formatLocal(new Date(order.pickupAt), locale === 'es' ? "EEEE d 'de' MMMM" : 'EEEE, MMMM d')
    : ''

const pickupTime = (order: Order, locale: Locale) =>
  order.pickupAt ? formatWallTime(formatLocal(new Date(order.pickupAt), 'HH:mm'), locale) : ''

function itemRows(order: Order, locale: Locale): string {
  return order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0;">${i.qty} × ${esc(i.nameSnapshot)}</td>
<td align="right" style="padding:4px 0;">${formatMoney(i.lineTotalCents, locale)}</td></tr>`,
    )
    .join('')
}

function moneyBlock(order: Order, locale: Locale, L: Record<string, string>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:15px;">
${itemRows(order, locale)}
<tr><td style="padding-top:8px;border-top:1px solid ${C.line};">${L.subtotal}</td>
<td align="right" style="padding-top:8px;border-top:1px solid ${C.line};">${formatMoney(order.subtotalCents, locale)}</td></tr>
<tr><td>${L.tax}</td><td align="right">${formatMoney(order.taxCents, locale)}</td></tr>
<tr><td style="font-weight:700;">${L.total}</td>
<td align="right" style="font-weight:700;">${formatMoney(order.totalCents, locale)}</td></tr>
</table>`
}

/* ------------------------------------------------------------------ */
/* 1 · order-confirmed                                                 */
/* ------------------------------------------------------------------ */

export function orderConfirmedEmail(order: Order, locale: Locale, magicLink: string): EmailBody {
  const L =
    locale === 'es'
      ? {
          subject: `Tu pedido está confirmado — ${order.orderNumber}`,
          thanks: `¡Gracias, ${firstName(order.contactName)}!`,
          lede: 'Tu pedido está confirmado y lo tendremos listo.',
          pickup: 'Recoger',
          orderNo: 'Pedido',
          subtotal: 'Subtotal',
          tax: 'Impuesto',
          total: 'Total',
          paid: 'pagado',
          where: 'Dónde',
          directions: 'Cómo llegar',
          manage: 'Administra tu pedido',
          change: '¿Necesitas cambiar algo?',
        }
      : {
          subject: `Your order is confirmed — ${order.orderNumber}`,
          thanks: `Thank you, ${firstName(order.contactName)}!`,
          lede: "Your order is confirmed and we'll have it ready.",
          pickup: 'Pickup',
          orderNo: 'Order',
          subtotal: 'Subtotal',
          tax: 'Tax',
          total: 'Total',
          paid: 'paid',
          where: 'Where',
          directions: 'Get directions',
          manage: 'Manage your order',
          change: 'Need to change something?',
        }

  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.thanks)}</h1>
<p style="margin:0 0 16px;">${esc(L.lede)}</p>
<p style="margin:0 0 4px;"><strong>${L.pickup}:</strong> ${esc(pickupLine(order, locale))} · ${esc(pickupTime(order, locale))}</p>
<p style="margin:0 0 16px;"><strong>${L.orderNo}:</strong> ${esc(order.orderNumber)}</p>
${moneyBlock(order, locale, L)}
<p style="margin:0 0 4px;"><strong>${L.where}:</strong> ${BUSINESS.street} ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}</p>
<p style="margin:0 0 16px;"><a href="${DIRECTIONS_URL}" style="color:${C.accentStrong};">${L.directions}</a></p>
<p style="margin:16px 0 0;">${esc(L.change)}</p>
${emailButton(magicLink, L.manage)}`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.lede, body }) }
}

/**
 * The confirmation SMS. Under 160 in both languages.
 *
 * Carries the STOP notice because this is the first message this number
 * receives — the first message to a number always does, even when the
 * message itself is transactional.
 */
export function orderConfirmedSms(order: Order, locale: Locale, time: string): string {
  return locale === 'es'
    ? `La Sabrosita: pedido ${order.orderNumber} confirmado. Recoger ${time}. 7730 Midlothian Tpke Ste A. STOP para cancelar.`
    : `La Sabrosita: order ${order.orderNumber} confirmed. Pickup ${time}. 7730 Midlothian Tpke Ste A. Reply STOP to opt out.`
}

/* ------------------------------------------------------------------ */
/* 2 · cake-confirmed                                                  */
/* ------------------------------------------------------------------ */

export function cakeConfirmedEmail(
  order: Order,
  spec: CakeSpec,
  locale: Locale,
  magicLink: string,
  policy: { fullHours: number; partialHours: number; partialPct: number },
): EmailBody {
  const balance = Math.max(0, order.totalCents - order.amountPaidCents)

  const L =
    locale === 'es'
      ? {
          subject: `Tu pastel está apartado — ${order.orderNumber}`,
          head: `${firstName(order.contactName)}, tu pastel está apartado.`,
          pickup: 'Recoger',
          yours: 'Tu pastel',
          size: 'Tamaño',
          servings: 'porciones',
          tiers: 'Pisos',
          flavor: 'Sabor',
          filling: 'Relleno',
          frosting: 'Cubierta',
          finish: 'Decoración',
          inscription: 'Escribir en el pastel',
          colors: 'Colores',
          check: 'Revisa que el texto esté exactamente como lo quieres. Así lo vamos a escribir.',
          total: 'Total',
          deposit: 'Depósito pagado',
          balance: 'Saldo al recoger',
          cancels: 'Cancelaciones',
          view: 'Ver o cambiar tu pedido',
        }
      : {
          subject: `Your cake is booked — ${order.orderNumber}`,
          head: `${firstName(order.contactName)}, your cake is booked.`,
          pickup: 'Pickup',
          yours: 'Your cake',
          size: 'Size',
          servings: 'servings',
          tiers: 'Tiers',
          flavor: 'Flavor',
          filling: 'Filling',
          frosting: 'Frosting',
          finish: 'Decoration',
          inscription: 'Written on the cake',
          colors: 'Colors',
          check: "Check the text is exactly how you want it. That's how we'll write it.",
          total: 'Total',
          deposit: 'Deposit paid',
          balance: 'Balance at pickup',
          cancels: 'Cancellations',
          view: 'View or change your order',
        }

  const cancelText =
    locale === 'es'
      ? `más de ${policy.fullHours} horas antes, reembolso completo. Entre ${policy.partialHours} y ${policy.fullHours} horas, ${policy.partialPct}%. Menos de ${policy.partialHours} horas, sin reembolso.`
      : `more than ${policy.fullHours} hours ahead, full refund. Between ${policy.partialHours} and ${policy.fullHours} hours, ${policy.partialPct}%. Less than ${policy.partialHours} hours, no refund.`

  const detail = [
    `${L.size}: ${esc(spec.sizeLabel)} (${spec.servings} ${L.servings})`,
    `${L.tiers}: ${spec.tiers}`,
    [spec.flavor && `${L.flavor}: ${esc(spec.flavor)}`, spec.filling && `${L.filling}: ${esc(spec.filling)}`, spec.frosting && `${L.frosting}: ${esc(spec.frosting)}`]
      .filter(Boolean)
      .join(' · '),
    spec.finish && `${L.finish}: ${esc(spec.finish)}`,
    spec.colorNotes && `${L.colors}: ${esc(spec.colorNotes)}`,
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 4px;">${line}</p>`)
    .join('')

  const body = `
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.head)}</h1>
<p style="margin:0 0 16px;"><strong>${L.pickup}:</strong> ${esc(pickupLine(order, locale))} · ${esc(pickupTime(order, locale))}</p>
<p style="margin:16px 0 8px;font-weight:700;">${L.yours}</p>
${detail}
${
  spec.inscription
    ? `<div style="margin:16px 0;padding:16px;background:${C.accentSoft};border-radius:14px;">
<p style="margin:0 0 4px;font-size:14px;color:${C.inkMuted};">${L.inscription}</p>
<p style="margin:0;font-family:Georgia,serif;font-size:22px;">«${esc(spec.inscription)}»</p>
</div>
<p style="margin:0 0 16px;font-weight:700;">${esc(L.check)}</p>`
    : ''
}
<p style="margin:16px 0 0;">${L.total} ${formatMoney(order.totalCents, locale)} · ${L.deposit} ${formatMoney(order.amountPaidCents, locale)}</p>
<p style="margin:4px 0 16px;font-weight:700;">${L.balance} ${formatMoney(balance, locale)}</p>
<p style="margin:0 0 16px;font-size:14px;color:${C.inkMuted};"><strong>${L.cancels}:</strong> ${esc(cancelText)}</p>
${emailButton(magicLink, L.view)}`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.head, body }) }
}

/* ------------------------------------------------------------------ */
/* 3 · order-ready — SMS + email                                       */
/* ------------------------------------------------------------------ */

/** Under 160 characters in both languages. Measured, not assumed. */
export function orderReadySms(order: Order, locale: Locale, closingTime: string): string {
  return locale === 'es'
    ? `La Sabrosita: tu pedido ${order.orderNumber} está listo. 7730 Midlothian Tpke Ste A. Hasta las ${closingTime}. Responde STOP para cancelar.`
    : `La Sabrosita: order ${order.orderNumber} is ready. 7730 Midlothian Tpke Ste A. Until ${closingTime}. Reply STOP to opt out.`
}

export function orderReadyEmail(order: Order, locale: Locale, closingTime: string): EmailBody {
  const L =
    locale === 'es'
      ? {
          subject: `Tu pedido está listo — ${order.orderNumber}`,
          head: `${firstName(order.contactName)}, tu pedido está listo.`,
          until: `Te esperamos hasta las ${closingTime}.`,
          directions: 'Cómo llegar',
        }
      : {
          subject: `Your order is ready — ${order.orderNumber}`,
          head: `${firstName(order.contactName)}, your order is ready.`,
          until: `We're here until ${closingTime}.`,
          directions: 'Get directions',
        }

  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.head)}</h1>
<p style="margin:0 0 16px;">${esc(L.until)}</p>
<p style="margin:0 0 8px;">${BUSINESS.street} ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}</p>
${emailButton(DIRECTIONS_URL, L.directions)}`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.until, body }) }
}

/* ------------------------------------------------------------------ */
/* 4 · order-reminder                                                  */
/* ------------------------------------------------------------------ */

export function orderReminderSms(order: Order, locale: Locale, time: string): string {
  return locale === 'es'
    ? `La Sabrosita: recuerda tu pedido ${order.orderNumber} hoy a las ${time}. Responde 1 para confirmar o 2 para cancelar.`
    : `La Sabrosita: reminder, order ${order.orderNumber} today at ${time}. Reply 1 to confirm or 2 to cancel.`
}

/* ------------------------------------------------------------------ */
/* 5 · order-cancelled — no upsell, no marketing                       */
/* ------------------------------------------------------------------ */

export function orderCancelledEmail(
  order: Order,
  locale: Locale,
  refundCents: number,
): EmailBody {
  const L =
    locale === 'es'
      ? {
          subject: `Pedido cancelado — ${order.orderNumber}`,
          head: `Cancelamos tu pedido ${order.orderNumber}.`,
          refund: `Te devolvemos ${formatMoney(refundCents, locale)}.`,
          none: 'No se hizo ningún cargo.',
          when: 'El reembolso llega a tu banco en 5 a 10 días hábiles.',
          call: 'Si tienes alguna duda, llámanos.',
        }
      : {
          subject: `Order cancelled — ${order.orderNumber}`,
          head: `We've cancelled order ${order.orderNumber}.`,
          refund: `We're refunding ${formatMoney(refundCents, locale)}.`,
          none: 'Nothing was charged.',
          when: 'Refunds reach your bank in 5 to 10 business days.',
          call: 'If you have any questions, give us a call.',
        }

  // Someone cancelling is not a moment to sell. No CTA, no offer.
  const body = `
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.head)}</h1>
<p style="margin:0 0 8px;">${refundCents > 0 ? esc(L.refund) : esc(L.none)}</p>
${refundCents > 0 ? `<p style="margin:0 0 16px;">${esc(L.when)}</p>` : ''}
<p style="margin:16px 0 0;">${esc(L.call)}</p>`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.head, body }) }
}

/* ------------------------------------------------------------------ */
/* 6 · review-request                                                  */
/* ------------------------------------------------------------------ */

export function reviewRequestEmail(
  order: Order,
  locale: Locale,
  topItem: string,
  googleReviewUrl: string,
): EmailBody {
  const L =
    locale === 'es'
      ? {
          subject: `¿Cómo estuvo tu ${topItem}?`,
          head: `Gracias por venir, ${firstName(order.contactName)}.`,
          ask: 'Si te gustó, una reseña en Google nos ayuda muchísimo. Toma un minuto.',
          cta: 'Dejar una reseña',
          tell: `Y si algo no estuvo bien, dinos primero a nosotros — contesta este correo o llámanos al ${BUSINESS.phonePrimaryDisplay}. Lo arreglamos.`,
        }
      : {
          subject: `How was your ${topItem}?`,
          head: `Thanks for coming in, ${firstName(order.contactName)}.`,
          ask: 'If you enjoyed it, a Google review helps us a lot. It takes a minute.',
          cta: 'Leave a review',
          tell: `And if something wasn't right, tell us first — reply to this email or call ${BUSINESS.phonePrimaryDisplay}. We'll fix it.`,
        }

  /*
   * NOT REVIEW GATING. The Google link comes FIRST and is available to
   * everyone regardless of how they felt. The "tell us first" line sits
   * BELOW it — it is there because it is the right thing to say and
   * because it gives an unhappy customer a faster path than a one-star
   * review, not as a filter. Gating a review link behind a satisfaction
   * question violates Google's policy and is dishonest.
   */
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.head)}</h1>
<p style="margin:0 0 8px;">${esc(L.ask)}</p>
${emailButton(googleReviewUrl, L.cta)}
<p style="margin:16px 0 0;font-size:15px;color:${C.inkMuted};">${esc(L.tell)}</p>`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.ask, body }) }
}

/* ------------------------------------------------------------------ */
/* 7 · wholesale-welcome                                               */
/* ------------------------------------------------------------------ */

export function wholesaleWelcomeEmail(
  storeName: string,
  locale: Locale,
  details: { deliveryDay: string; route: string; cutoff: string; terms: number },
  setupLink: string,
): EmailBody {
  const L =
    locale === 'es'
      ? {
          subject: `Tu cuenta de mayoreo está lista — ${storeName}`,
          head: `${storeName}, tu cuenta está aprobada.`,
          day: 'Día de entrega',
          route: 'Ruta',
          cutoff: 'Cierre de pedidos',
          terms: 'Términos',
          how: 'Entra con el enlace de abajo, arma tu pedido de la lista y déjalo fijo. Lo cambias cuando quieras.',
          cta: 'Crear tu contraseña',
          expiry: 'El enlace vence en 14 días.',
        }
      : {
          subject: `Your wholesale account is ready — ${storeName}`,
          head: `${storeName}, your account is approved.`,
          day: 'Delivery day',
          route: 'Route',
          cutoff: 'Order cutoff',
          terms: 'Terms',
          how: 'Sign in below, build your order from the line sheet, and set it as your standing order. Change it any time.',
          cta: 'Set your password',
          expiry: 'The link expires in 14 days.',
        }

  const body = `
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;">${esc(L.head)}</h1>
<p style="margin:0 0 4px;"><strong>${L.day}:</strong> ${esc(details.deliveryDay)}</p>
<p style="margin:0 0 4px;"><strong>${L.route}:</strong> ${esc(details.route)}</p>
<p style="margin:0 0 4px;"><strong>${L.cutoff}:</strong> ${esc(details.cutoff)}</p>
<p style="margin:0 0 16px;"><strong>${L.terms}:</strong> ${locale === 'es' ? 'Neto' : 'Net'} ${details.terms}</p>
<p style="margin:0 0 8px;">${esc(L.how)}</p>
${emailButton(setupLink, L.cta)}
<p style="margin:0;font-size:14px;color:${C.inkMuted};">${esc(L.expiry)}</p>`

  return { subject: L.subject, html: emailLayout({ locale, preheader: L.head, body }) }
}

/* ------------------------------------------------------------------ */
/* 8 · standing-order-notice                                           */
/* ------------------------------------------------------------------ */

export function standingOrderNoticeSms(
  locale: Locale,
  summary: string,
  cutoff: string,
): string {
  return locale === 'es'
    ? `La Sabrosita: mañana te llevamos ${summary}. ¿Cambias algo? Tienes hasta las ${cutoff}. STOP para cancelar.`
    : `La Sabrosita: tomorrow we bring ${summary}. Changing anything? You have until ${cutoff}. STOP to opt out.`
}
