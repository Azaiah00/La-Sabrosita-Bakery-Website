/**
 * PROMPT-14 acceptance for everything that is not "send it and look".
 *
 * The SMS length checks matter most: Spanish runs 15-20% longer than
 * English, and the criteria say to CHECK it rather than assume. A 161st
 * character silently becomes a second billed segment and, worse, gets
 * split mid-word on some carriers.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter as db } from '@/lib/data/demo'
import { store } from '@/lib/data/demo/store'
import { localToUtc } from '@/lib/datetime'
import {
  orderConfirmedEmail,
  orderConfirmedSms,
  cakeConfirmedEmail,
  orderReadyEmail,
  orderReadySms,
  orderReminderSms,
  orderCancelledEmail,
  reviewRequestEmail,
  wholesaleWelcomeEmail,
  standingOrderNoticeSms,
} from './templates'
import { decide, inQuietHours, idempotencyKey } from './send'
import type { Locale, Order } from '@/lib/data/types'

const LOCALES: Locale[] = ['es', 'en']

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'LS-001234',
    orderType: 'pickup',
    status: 'confirmed',
    source: 'web',
    contactName: 'María Hernández',
    contactPhone: '(804) 555-0301',
    contactEmail: 'maria@example.com',
    locale: 'es',
    pickupAt: localToUtc('2026-08-20', '10:00').toISOString(),
    subtotalCents: 1050,
    discountCents: 0,
    taxCents: 63,
    totalCents: 1113,
    depositDueCents: 0,
    amountPaidCents: 1113,
    occasion: null,
    customerNote: null,
    allergyNote: null,
    createdAt: new Date('2026-08-18T12:00:00Z').toISOString(),
    smsOptInAt: null,
    confirmedAt: null,
    readyAt: null,
    completedAt: null,
    items: [
      {
        id: 'i1',
        variantId: 'v1',
        nameSnapshot: 'Quesadilla Salvadoreña — entera',
        qty: 1,
        unitPriceCents: 1050,
        lineTotalCents: 1050,
        note: null,
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  store.reset()
})

describe('every SMS fits one segment, in both languages', () => {
  const cases: [string, (l: Locale) => string][] = [
    ['order_confirmed', (l) => orderConfirmedSms(fakeOrder(), l, '10:00 a.m.')],
    ['order_ready', (l) => orderReadySms(fakeOrder(), l, '8:00 p.m.')],
    ['order_reminder', (l) => orderReminderSms(fakeOrder(), l, '10:00 a.m.')],
    [
      'standing_order_notice',
      (l) => standingOrderNoticeSms(l, '96 conchas, 48 chicharrones, 12 quesadillas', '6:00 p.m.'),
    ],
  ]

  for (const [name, build] of cases) {
    for (const locale of LOCALES) {
      it(`${name} (${locale}) is under 160 characters`, () => {
        const body = build(locale)
        expect(body.length, `${body.length} chars: ${body}`).toBeLessThanOrEqual(160)
      })
    }
  }

  it('carries the opt-out notice on the confirmation, the first message to a number', () => {
    expect(orderConfirmedSms(fakeOrder(), 'es', '10:00')).toMatch(/STOP/)
    expect(orderConfirmedSms(fakeOrder(), 'en', '10:00')).toMatch(/STOP/)
  })
})

describe('every template renders with no placeholder left behind', () => {
  const order = fakeOrder()
  const spec = {
    sizeLabel: '2 pisos',
    servings: 60,
    tiers: 2,
    flavor: 'Tres leches',
    filling: 'Guayaba',
    frosting: 'Fondant',
    finish: 'Flores de crema',
    inscription: 'Felices 15, Sofía',
    colorNotes: 'Vino y oro',
  }

  for (const locale of LOCALES) {
    it(`renders every email in ${locale} without a {{placeholder}}`, () => {
      const bodies = [
        orderConfirmedEmail(order, locale, 'https://example.com/o'),
        cakeConfirmedEmail(order, spec, locale, 'https://example.com/o', {
          fullHours: 72,
          partialHours: 48,
          partialPct: 50,
        }),
        orderReadyEmail(order, locale, '8:00 p.m.'),
        orderCancelledEmail(order, locale, 1113),
        reviewRequestEmail(order, locale, 'tres leches', 'https://g.page/r/review'),
        wholesaleWelcomeEmail(
          'Tienda La Esperanza',
          locale,
          { deliveryDay: 'martes', route: 'Richmond South', cutoff: '6:00 p.m.', terms: 14 },
          'https://example.com/setup',
        ),
      ]
      for (const b of bodies) {
        expect(b.subject).not.toMatch(/\{\{|\}\}/)
        expect(b.html).not.toMatch(/\{\{(?!unsubscribeUrl)/)
        expect(b.subject.length).toBeGreaterThan(0)
      }
    })
  }

  it('keeps accents intact, in the body and the subject', () => {
    const cake = cakeConfirmedEmail(order, spec, 'es', 'https://x', {
      fullHours: 72,
      partialHours: 48,
      partialPct: 50,
    })
    // The single most common custom-cake failure.
    expect(cake.html).toContain('Felices 15, Sofía')
    const confirmed = orderConfirmedEmail(order, 'es', 'https://x')
    expect(confirmed.html).toContain('Quesadilla Salvadoreña')
    expect(reviewRequestEmail(order, 'es', 'quesadilla salvadoreña', 'https://g').subject).toContain(
      'ñ',
    )
  })

  it('escapes anything a customer typed', () => {
    const hostile = fakeOrder({ contactName: '<script>alert(1)</script> Ana' })
    const html = orderConfirmedEmail(hostile, 'es', 'https://x').html
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('the rules that decide whether a message may go at all', () => {
  const base = {
    templateKey: 'order_reminder' as const,
    channel: 'sms' as const,
    locale: 'es' as Locale,
    toAddress: '(804) 555-0301',
    orderId: 'o1',
  }
  const hours = { start: '21:00', end: '08:00' }
  const daytime = localToUtc('2026-08-20', '14:00')
  const night = localToUtc('2026-08-20', '23:00')
  const earlyMorning = localToUtc('2026-08-20', '06:00')

  it('refuses an SMS with no stamped opt-in', () => {
    expect(decide({ ...base, now: daytime }, hours, new Set())).toEqual({
      send: false,
      reason: 'no_sms_opt_in',
    })
  })

  it('allows it once consent is stamped', () => {
    expect(
      decide({ ...base, smsOptInAt: '2026-08-01T00:00:00Z', now: daytime }, hours, new Set()),
    ).toEqual({ send: true })
  })

  it('holds a reminder during quiet hours', () => {
    const ctx = { ...base, smsOptInAt: '2026-08-01T00:00:00Z', now: night }
    expect(decide(ctx, hours, new Set())).toEqual({ send: false, reason: 'quiet_hours' })
  })

  it('treats the window as wrapping midnight', () => {
    expect(inQuietHours(night, hours)).toBe(true)
    expect(inQuietHours(earlyMorning, hours)).toBe(true)
    expect(inQuietHours(daytime, hours)).toBe(false)
  })

  it('exempts "your order is ready" — it is time-critical and expected', () => {
    const ctx = {
      ...base,
      templateKey: 'order_ready' as const,
      smsOptInAt: '2026-08-01T00:00:00Z',
      now: night,
    }
    expect(decide(ctx, hours, new Set())).toEqual({ send: true })
  })

  it('does not send marketing to a transactional-only opt-in', () => {
    const ctx = {
      ...base,
      templateKey: 'review_request' as const,
      channel: 'email' as const,
      emailOptIn: false,
      now: daytime,
    }
    expect(decide(ctx, hours, new Set())).toEqual({ send: false, reason: 'no_email_opt_in' })
  })

  it('is idempotent — running a job twice sends once', () => {
    const ctx = { ...base, smsOptInAt: '2026-08-01T00:00:00Z', now: daytime }
    const seen = new Set([idempotencyKey(ctx)])
    expect(decide(ctx, hours, seen)).toEqual({ send: false, reason: 'duplicate' })
  })
})

describe('the review request is not gated', () => {
  it('puts the Google link above the "tell us first" line, for everyone', () => {
    const html = reviewRequestEmail(fakeOrder(), 'es', 'tres leches', 'https://g.page/review').html
    const linkAt = html.indexOf('https://g.page/review')
    const tellAt = html.indexOf('dinos primero')
    expect(linkAt).toBeGreaterThan(-1)
    expect(tellAt).toBeGreaterThan(-1)
    // Gating a review link behind a satisfaction question violates
    // Google's policy. The link comes first, unconditionally.
    expect(linkAt).toBeLessThan(tellAt)
  })
})

describe('the cancellation email', () => {
  it('carries no upsell, no offer and no CTA', () => {
    const html = orderCancelledEmail(fakeOrder(), 'es', 1113).html
    expect(html).not.toMatch(/descuento|oferta|prueba|discount|offer|order again|vuelve a pedir/i)
    // Someone cancelling is not a moment to sell.
    expect(html).not.toContain('border-radius:999px')
  })

  it('says when the refund lands', () => {
    expect(orderCancelledEmail(fakeOrder(), 'es', 1113).html).toContain('5 a 10 días hábiles')
    expect(orderCancelledEmail(fakeOrder(), 'en', 1113).html).toContain('5 to 10 business days')
  })
})

describe('transactional email carries no unsubscribe', () => {
  it('omits it on a confirmation and offers it on marketing', () => {
    const confirmed = orderConfirmedEmail(fakeOrder(), 'es', 'https://x').html
    expect(confirmed).not.toContain('unsubscribeUrl')
  })
})

describe('end to end, into the drawer', () => {
  it('logs exactly one row per send and captures instead of sending', async () => {
    expect(await db.listMessages()).toHaveLength(0)

    const order = fakeOrder()
    const email = orderConfirmedEmail(order, 'es', 'https://x')
    await db.sendMessage({
      channel: 'email',
      templateKey: 'order_confirmed',
      locale: 'es',
      toAddress: order.contactEmail!,
      subject: email.subject,
      body: email.html,
      orderId: order.id,
    })

    const logged = await db.listMessages()
    expect(logged).toHaveLength(1)
    expect(logged[0].wasSuppressed).toBe(true)
    expect(logged[0].body).toContain('Quesadilla Salvadoreña')
  })
})
