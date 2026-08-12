/**
 * The mutations PROMPT-00 Part C says must actually work during the
 * demo. Each of these is a moment in the pitch, so each one gets a test.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { demoAdapter } from './index'
import { store } from './store'
import { businessDate, localToUtc } from '@/lib/datetime'

const CONCHA_PRODUCT = 'c0000000-0000-0000-0000-000000000001'
const CONCHA_VARIANT = 'd0000000-0000-0000-0000-000000000001'
const BUTTER = 'e0000000-0000-0000-0000-000000000003'

const today = () => store.get().today

beforeEach(() => {
  store.reset()
})

describe('86 a product', () => {
  it('marks it off the menu, and a reset puts it back', async () => {
    const before = await demoAdapter.getMenu('es')
    const conchaBefore = before
      .flatMap((c) => c.products)
      .find((p) => p.id === CONCHA_PRODUCT)!
    expect(conchaBefore.is86ed).toBe(false)

    await demoAdapter.setEightySixed(CONCHA_PRODUCT, true)

    const after = await demoAdapter.getMenu('es')
    const conchaAfter = after.flatMap((c) => c.products).find((p) => p.id === CONCHA_PRODUCT)!
    expect(conchaAfter.is86ed).toBe(true)

    store.reset()
    const reset = await demoAdapter.getMenu('es')
    expect(reset.flatMap((c) => c.products).find((p) => p.id === CONCHA_PRODUCT)!.is86ed).toBe(false)
  })

  it('refuses to sell an 86ed item', async () => {
    await demoAdapter.setEightySixed(CONCHA_PRODUCT, true)
    await expect(
      demoAdapter.placeOrder({
        orderType: 'pickup',
        contactName: 'Prueba',
        contactPhone: '(804) 555-0000',
        locale: 'es',
        pickupAt: localToUtc(today(), '10:00').toISOString(),
        items: [{ variantId: CONCHA_VARIANT, qty: 1 }],
      }),
    ).rejects.toThrow(/86ed/)
  })
})

describe('placing an order', () => {
  it('appears in the queue and decrements the day\'s stock', async () => {
    const date = today()
    const before = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!

    const order = await demoAdapter.placeOrder({
      orderType: 'pickup',
      contactName: 'Prueba',
      contactPhone: '(804) 555-0000',
      contactEmail: 'prueba@example.com',
      locale: 'es',
      pickupAt: localToUtc(date, '11:00').toISOString(),
      items: [{ variantId: CONCHA_VARIANT, qty: 4 }],
    })

    // 4 × $1.75 = $7.00, plus 6% tax.
    expect(order.subtotalCents).toBe(700)
    expect(order.taxCents).toBe(42)
    expect(order.totalCents).toBe(742)
    // Nothing is confirmed before payment clears.
    expect(order.status).toBe('pending_payment')

    const after = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!
    expect(after.qtyRemaining).toBe(before.qtyRemaining - 4)

    const queue = await demoAdapter.listOrders({ date })
    expect(queue.some((o) => o.id === order.id)).toBe(true)
  })

  it('will not oversell the day\'s bake', async () => {
    const date = today()
    const remaining = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!.qtyRemaining

    await expect(
      demoAdapter.placeOrder({
        orderType: 'pickup',
        contactName: 'Prueba',
        contactPhone: '(804) 555-0000',
        locale: 'es',
        pickupAt: localToUtc(date, '11:00').toISOString(),
        items: [{ variantId: CONCHA_VARIANT, qty: remaining + 1 }],
      }),
    ).rejects.toThrow(/Only/)
  })

  it('gives the reservation back when the order is cancelled', async () => {
    const date = today()
    const before = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!.qtyRemaining

    const order = await demoAdapter.placeOrder({
      orderType: 'pickup',
      contactName: 'Prueba',
      contactPhone: '(804) 555-0000',
      locale: 'es',
      pickupAt: localToUtc(date, '11:00').toISOString(),
      items: [{ variantId: CONCHA_VARIANT, qty: 3 }],
    })
    await demoAdapter.setOrderStatus(order.id, 'cancelled')

    const after = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!.qtyRemaining
    expect(after).toBe(before)
  })
})

describe('Reiniciar demo', () => {
  it('restores fixture data that was edited in place', async () => {
    // Regression: `buildFixtures` hands back module-level arrays by
    // reference, so without a deep clone in `pristine()` an ingredient
    // cost change wrote through to the constants and survived a reset —
    // the safety net stopped working after the first shock demo.
    const before = (await demoAdapter.getIngredients()).find((i) => i.id === BUTTER)!.lastUnitCost
    expect(before).toBe(0.0095)

    await demoAdapter.setIngredientCost(BUTTER, 0.5)
    expect((await demoAdapter.getIngredients()).find((i) => i.id === BUTTER)!.lastUnitCost).toBe(0.5)

    store.reset()
    expect((await demoAdapter.getIngredients()).find((i) => i.id === BUTTER)!.lastUnitCost).toBe(
      before,
    )
    // And the derived numbers come back with it.
    const rows = await demoAdapter.getMarginTable()
    expect(rows.find((r) => r.variantId === CONCHA_VARIANT)!.foodCost).toBe(0.3943)
  })

  it('restores stock after an order, and the 86 flags with it', async () => {
    const date = store.get().today
    const before = (await demoAdapter.getDailyStock(date)).find(
      (r) => r.variantId === CONCHA_VARIANT,
    )!.qtyRemaining

    await demoAdapter.placeOrder({
      orderType: 'pickup',
      contactName: 'Prueba',
      contactPhone: '(804) 555-0000',
      locale: 'es',
      pickupAt: localToUtc(date, '11:00').toISOString(),
      items: [{ variantId: CONCHA_VARIANT, qty: 2 }],
    })
    await demoAdapter.setEightySixed(CONCHA_PRODUCT, true)

    store.reset()

    expect(
      (await demoAdapter.getDailyStock(date)).find((r) => r.variantId === CONCHA_VARIANT)!
        .qtyRemaining,
    ).toBe(before)
    const menu = await demoAdapter.getMenu('es')
    expect(menu.flatMap((c) => c.products).find((p) => p.id === CONCHA_PRODUCT)!.is86ed).toBe(false)
  })
})

describe('changing an ingredient cost', () => {
  it('moves every affected food cost and margin', async () => {
    const margin = (rows: Awaited<ReturnType<typeof demoAdapter.getMarginTable>>) =>
      rows.find((r) => r.variantId === CONCHA_VARIANT)!

    const before = margin(await demoAdapter.getMarginTable())
    expect(before.foodCost).toBe(0.3943)
    expect(before.marginPct).toBe(77.47)

    await demoAdapter.setIngredientCost(BUTTER, 0.019)

    const after = margin(await demoAdapter.getMarginTable())
    expect(after.foodCost).toBe(0.5765)
    expect(after.marginPct).toBeLessThan(before.marginPct!)
    // Butter is in the sugar-shell sub-recipe too — the whole tree re-costs.
    expect(await demoAdapter.getRecipeCost('f0000000-0000-0000-0000-000000000004')).toBe(6.79)
  })
})

describe('messages', () => {
  it('captures instead of sending', async () => {
    expect(await demoAdapter.listMessages()).toHaveLength(0)

    await demoAdapter.sendMessage({
      channel: 'sms',
      templateKey: 'order_confirmed',
      locale: 'es',
      toAddress: '(804) 555-0000',
      body: 'Pedido confirmado.',
    })

    const logged = await demoAdapter.listMessages()
    expect(logged).toHaveLength(1)
    expect(logged[0].wasSuppressed).toBe(true)
  })
})

describe('approving a wholesale account', () => {
  it('moves it from pending to approved', async () => {
    const pending = (await demoAdapter.getWholesaleAccounts()).find((a) => a.status === 'pending')!
    const approved = await demoAdapter.setWholesaleAccountStatus(pending.id, 'approved')
    expect(approved.status).toBe('approved')
    expect(approved.approvedAt).not.toBeNull()
  })
})

describe('getOrderByToken', () => {
  it('resolves a seeded order by its number in demo mode', async () => {
    const found = await demoAdapter.getOrderByToken('LS-001000')
    expect(found?.orderNumber).toBe('LS-001000')
  })

  it('refuses to run outside demo mode', async () => {
    // Order numbers are sequential. Matching on one is only tolerable
    // because this adapter holds fixtures on a laptop with no network.
    const previous = process.env.NEXT_PUBLIC_DEMO_MODE
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false'
    vi.resetModules()
    try {
      const { demoAdapter: cold } = await import('./index')
      await expect(cold.getOrderByToken('LS-001000')).rejects.toThrow(/enumerable/)
    } finally {
      process.env.NEXT_PUBLIC_DEMO_MODE = previous
      vi.resetModules()
    }
  })
})

describe('the seeded week of orders', () => {
  it('leaves a full queue for today', async () => {
    const orders = await demoAdapter.listOrders({ date: today() })
    expect(orders.length).toBeGreaterThanOrEqual(2)
    expect(orders.every((o) => o.status === 'confirmed')).toBe(true)
  })

  it('resolves "today" against the real business date', () => {
    expect(today()).toBe(businessDate(new Date()))
  })
})
