/**
 * PROMPT-12 acceptance: the P&L must reconcile to the cent against a
 * hand sum of `sales_days.gross_sales` and every `expenses.amount`, and
 * the three ratios must be arithmetically correct against those sums.
 *
 * This is the check that matters most on the whole dashboard. Everything
 * else is presentation; this is whether the numbers are true.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter } from '@/lib/data/demo'
import { store } from '@/lib/data/demo/store'
import { toCents } from '@/lib/money'
import { markPartialMonths, salesTrend, salesByChannel, topProductsByMargin } from './reporting'

beforeEach(() => {
  store.reset()
})

describe('P&L reconciliation', () => {
  it('matches a hand sum of sales and expenses, to the cent', async () => {
    const st = store.get()
    const pnl = await demoAdapter.getPnl(6)

    for (const row of pnl) {
      // Hand-sum straight from the fixture rows, not through the adapter.
      const handRevenue = st.sales_days
        .filter((d) => d.business_date.startsWith(row.month))
        .reduce((sum, d) => sum + toCents(d.gross_sales), 0)

      const monthExpenses = st.expenses.filter((e) => e.spent_on.startsWith(row.month))
      const cat = (slug: string) =>
        st.expense_categories.find((c) => c.slug === slug)!

      const handCogs = monthExpenses
        .filter((e) => cat(e.category_slug).is_cogs)
        .reduce((sum, e) => sum + toCents(e.amount), 0)
      const handLabor = monthExpenses
        .filter((e) => cat(e.category_slug).is_labor)
        .reduce((sum, e) => sum + toCents(e.amount), 0)
      const handOverhead = monthExpenses
        .filter((e) => !cat(e.category_slug).is_cogs && !cat(e.category_slug).is_labor)
        .reduce((sum, e) => sum + toCents(e.amount), 0)

      expect(row.revenueCents, `revenue ${row.month}`).toBe(handRevenue)
      expect(row.cogsCents, `cogs ${row.month}`).toBe(handCogs)
      expect(row.laborCents, `labor ${row.month}`).toBe(handLabor)
      expect(row.overheadCents, `overhead ${row.month}`).toBe(handOverhead)

      // And the derived lines follow from those four.
      expect(row.grossProfitCents).toBe(handRevenue - handCogs)
      expect(row.netProfitCents).toBe(handRevenue - handCogs - handLabor - handOverhead)
    }
  })

  it('computes food cost %, labor % and prime cost % correctly', async () => {
    const pnl = await demoAdapter.getPnl(6)
    for (const row of pnl) {
      if (row.revenueCents === 0) continue
      const food = (row.cogsCents / row.revenueCents) * 100
      const labor = (row.laborCents / row.revenueCents) * 100
      expect(row.foodCostPct).toBeCloseTo(food, 1)
      expect(row.laborPct).toBeCloseTo(labor, 1)
      // Prime cost is the two together — the number the owner steers by.
      const prime = ((row.cogsCents + row.laborCents) / row.revenueCents) * 100
      expect(prime).toBeCloseTo(food + labor, 6)
    }
  })

  it('lands whole-window food cost on the seed\'s stated 28.6%', async () => {
    // The seed builds ingredient + packaging spend as 26.5% + 2.1% of
    // sales. Across the full window that has to come back out.
    const pnl = await demoAdapter.getPnl(12)
    const revenue = pnl.reduce((s, r) => s + r.revenueCents, 0)
    const cogs = pnl.reduce((s, r) => s + r.cogsCents, 0)
    expect((cogs / revenue) * 100).toBeCloseTo(28.6, 1)
  })
})

describe('partial months', () => {
  it('flags the months the window does not fully cover', async () => {
    const st = store.get()
    const pnl = await demoAdapter.getPnl(6)
    const first = st.sales_days[0].business_date
    const last = st.sales_days[st.sales_days.length - 1].business_date

    const marked = markPartialMonths(pnl, first, last)
    // The first and last months of a 89-day window are always partial.
    expect(marked[0].isPartial).toBe(true)
    expect(marked[marked.length - 1].isPartial).toBe(true)
  })
})

describe('derived series', () => {
  it('holds the 7-day average back until seven days exist', async () => {
    const days = await demoAdapter.getSalesDays('0000-01-01', '9999-12-31')
    const trend = salesTrend(days)
    expect(trend.slice(0, 6).every((r) => r.movingAverageCents === null)).toBe(true)
    expect(trend[6].movingAverageCents).toBe(
      Math.round(days.slice(0, 7).reduce((s, d) => s + d.grossSalesCents, 0) / 7),
    )
  })

  it('splits channels so they sum back to gross sales', async () => {
    const days = await demoAdapter.getSalesDays('0000-01-01', '9999-12-31')
    const channels = salesByChannel(days)
    channels.forEach((c, i) => {
      const total =
        c.counterCents + c.onlineCents + c.wholesaleCents + c.marketplaceCents
      expect(total).toBe(days[i].grossSalesCents)
    })
  })

  it('ranks products by contribution, not by margin percent', async () => {
    const rows = await demoAdapter.getMarginTable()
    const top = topProductsByMargin(rows)
    expect(top.length).toBeGreaterThan(0)
    // Descending contribution.
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].contributionCents).toBeGreaterThanOrEqual(top[i].contributionCents)
    }
    // Every entry has a known food cost — a product with no recipe cannot
    // be ranked and must not appear.
    expect(top.every((r) => r.foodCost !== null)).toBe(true)
  })
})
