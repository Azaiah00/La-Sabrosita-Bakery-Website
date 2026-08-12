/**
 * PROMPT-07 acceptance: fire 10 simultaneous submissions at a slot with
 * max_per_slot = 4. Exactly 4 succeed; 6 get the conflict.
 *
 * The seed sets cake capacity to 4 per hourly slot. In production the
 * guarantee comes from `claim_pickup_slot()` taking a transaction-scoped
 * advisory lock; here it comes from the check and the insert living in
 * one synchronous `store.mutate`, which cannot be interleaved.
 *
 * Either way the rule is the same one CLAUDE.md states: never check
 * capacity in application code and insert afterwards.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter, SlotFullError } from './index'
import { store } from './store'
import { localToUtc, addBusinessDays } from '@/lib/datetime'

const TRES_LECHES = 'd0000000-0000-0000-0000-000000000010'

beforeEach(() => {
  store.reset()
})

describe('slot capacity under concurrent submission', () => {
  it('lets exactly 4 through and rejects the other 6', async () => {
    // A date far enough out to be clear of the seeded week of orders.
    const date = addBusinessDays(store.get().today, 11)
    const pickupAt = localToUtc(date, '14:00').toISOString()

    const attempts = Array.from({ length: 10 }, (_, i) =>
      demoAdapter
        .placeOrder({
          orderType: 'cake',
          contactName: `Buyer ${i}`,
          contactPhone: '(804) 555-0000',
          locale: 'es',
          pickupAt,
          items: [{ variantId: TRES_LECHES, qty: 1 }],
        })
        .then(() => 'ok' as const)
        .catch((e) => (e instanceof SlotFullError ? ('full' as const) : ('error' as const))),
    )

    const results = await Promise.all(attempts)
    const ok = results.filter((r) => r === 'ok').length
    const full = results.filter((r) => r === 'full').length

    expect({ ok, full }).toEqual({ ok: 4, full: 6 })
  })

  it('reports the slot as unavailable afterwards', async () => {
    const date = addBusinessDays(store.get().today, 11)
    const pickupAt = localToUtc(date, '14:00').toISOString()

    for (let i = 0; i < 4; i++) {
      await demoAdapter.placeOrder({
        orderType: 'cake',
        contactName: `Buyer ${i}`,
        contactPhone: '(804) 555-0000',
        locale: 'es',
        pickupAt,
        items: [{ variantId: TRES_LECHES, qty: 1 }],
      })
    }

    const availability = await demoAdapter.getAvailability({
      orderType: 'cake',
      now: new Date(),
      fromDate: date,
      days: 1,
    })

    const slot = availability.dates[0].slots.find((s) => s.startsAt === '14:00')!
    expect(slot.remaining).toBe(0)
    expect(slot.isAvailable).toBe(false)
  })

  it('frees the slot again when an order is cancelled', async () => {
    const date = addBusinessDays(store.get().today, 12)
    const pickupAt = localToUtc(date, '14:00').toISOString()

    const orders = []
    for (let i = 0; i < 4; i++) {
      orders.push(
        await demoAdapter.placeOrder({
          orderType: 'cake',
          contactName: `Buyer ${i}`,
          contactPhone: '(804) 555-0000',
          locale: 'es',
          pickupAt,
          items: [{ variantId: TRES_LECHES, qty: 1 }],
        }),
      )
    }

    await demoAdapter.setOrderStatus(orders[0].id, 'cancelled')

    // A cancelled order must not keep holding capacity.
    await expect(
      demoAdapter.placeOrder({
        orderType: 'cake',
        contactName: 'Latecomer',
        contactPhone: '(804) 555-0000',
        locale: 'es',
        pickupAt,
        items: [{ variantId: TRES_LECHES, qty: 1 }],
      }),
    ).resolves.toBeTruthy()
  })
})
