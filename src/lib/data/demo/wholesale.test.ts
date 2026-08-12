/**
 * PROMPT-13 acceptance for the parts that are data, not UI.
 *
 * The aging buckets get a synthetic invoice each: the seed only
 * exercises four of the five, and "seed one invoice per bucket and
 * verify all five classify correctly" is explicit in the criteria.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter as db } from './index'
import { store } from './store'
import { addBusinessDays } from '@/lib/datetime'
import { toCents } from '@/lib/money'

const ESPERANZA = '04000000-0000-0000-0000-000000000001'
const PRIMOS = '04000000-0000-0000-0000-000000000004'
const CONCHA_VARIANT = 'd0000000-0000-0000-0000-000000000001'

beforeEach(() => {
  store.reset()
})

describe('aging buckets', () => {
  it('classifies all five, and excludes a paid invoice', async () => {
    const today = store.get().today

    // One invoice per bucket, all against the same account, plus a fully
    // paid one that must not appear anywhere.
    store.mutate((st) => {
      st.invoices = [
        mk('INV-B1', addBusinessDays(today, 14), 100), // not due yet -> current
        mk('INV-B2', addBusinessDays(today, -10), 200), // 10 late -> 1_30
        mk('INV-B3', addBusinessDays(today, -45), 300), // 45 late -> 31_60
        mk('INV-B4', addBusinessDays(today, -75), 400), // 75 late -> 61_90
        mk('INV-B5', addBusinessDays(today, -120), 500), // 120 late -> over_90
        { ...mk('INV-PAID', addBusinessDays(today, -200), 900), amount_paid: 900 },
      ]
    })

    const aging = await db.getAging()
    expect(aging).toHaveLength(1)
    const row = aging[0]

    expect(row.currentCents).toBe(toCents(100))
    expect(row.d1to30Cents).toBe(toCents(200))
    expect(row.d31to60Cents).toBe(toCents(300))
    expect(row.d61to90Cents).toBe(toCents(400))
    expect(row.over90Cents).toBe(toCents(500))
    // The paid one contributes nothing.
    expect(row.totalCents).toBe(toCents(1500))
  })

  it('counts only the unpaid balance of a partial payment', async () => {
    const today = store.get().today
    store.mutate((st) => {
      st.invoices = [{ ...mk('INV-P', addBusinessDays(today, -10), 500), amount_paid: 200 }]
    })
    const aging = await db.getAging()
    expect(aging[0].d1to30Cents).toBe(toCents(300))
  })

  function mk(number: string, dueDate: string, total: number) {
    return {
      id: number,
      business_id: '11111111-1111-1111-1111-111111111111',
      wholesale_account_id: ESPERANZA,
      invoice_number: number,
      status: 'sent',
      issue_date: dueDate,
      due_date: dueDate,
      subtotal: total,
      tax: 0,
      total,
      amount_paid: 0,
    }
  }
})

describe('the line sheet', () => {
  it('is priced from the account price list, not from retail', async () => {
    const items = await db.getPriceList(ESPERANZA)
    const concha = items.find((i) => i.variantId === CONCHA_VARIANT)!
    // Wholesale $0.95 against a retail $1.75 — never the retail price.
    expect(concha.unitPriceCents).toBe(toCents(0.95))
    expect(concha.retailPriceCents).toBe(toCents(1.75))
    expect(concha.unitPriceCents).toBeLessThan(concha.retailPriceCents)
  })

  it('carries case and minimum quantities so the UI can order in cases', async () => {
    const items = await db.getPriceList(ESPERANZA)
    expect(items.every((i) => i.caseQty > 0 && i.minQty > 0)).toBe(true)
    const concha = items.find((i) => i.variantId === CONCHA_VARIANT)!
    expect(concha.caseQty).toBe(24)
  })
})

describe('route sheets', () => {
  it('lists only approved accounts with a standing order on that day', async () => {
    // La Esperanza delivers on Tuesday (dow 2).
    const tuesday = await db.getRouteSheet(2)
    expect(tuesday.flatMap((r) => r.stops).map((s) => s.storeName)).toContain(
      'Tienda La Esperanza',
    )

    // A pending account is on nobody's van.
    const all = [0, 1, 2, 3, 4, 5, 6]
    const everyStop = (
      await Promise.all(all.map((d) => db.getRouteSheet(d)))
    ).flatMap((routes) => routes.flatMap((r) => r.stops))
    expect(everyStop.map((s) => s.storeName)).not.toContain('Carniceria Los Primos')
  })

  it('quantities are the standing-order case counts', async () => {
    const tuesday = await db.getRouteSheet(2)
    const stop = tuesday.flatMap((r) => r.stops).find((s) => s.storeName === 'Tienda La Esperanza')!
    const conchas = stop.lines.find((l) => l.variantId === CONCHA_VARIANT)!
    expect(conchas.qty).toBe(96)
  })

  it('approving a pending account puts it on the book', async () => {
    const before = await db.getWholesaleAccounts()
    expect(before.find((a) => a.id === PRIMOS)!.status).toBe('pending')

    const approved = await db.setWholesaleAccountStatus(PRIMOS, 'approved')
    expect(approved.status).toBe('approved')
    expect(approved.approvedAt).not.toBeNull()
    // And it inherits the default price list, so it can be quoted.
    expect(approved.priceListId).not.toBeNull()
  })
})
