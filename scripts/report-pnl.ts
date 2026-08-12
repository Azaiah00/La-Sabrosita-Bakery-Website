/**
 * Prints the P&L the admin dashboard will render, straight out of the
 * demo adapter — not out of a separate calculation. If this table looks
 * wrong, the dashboard will look wrong the same way.
 *
 * The sales, expense and labor rows are the hand-ported half of the
 * fixture generator (`insert … select` in seed.sql cannot be parsed), so
 * this is the check on that port.
 *
 * Run: npx cross-env NEXT_PUBLIC_DEMO_MODE=true npx tsx scripts/report-pnl.ts
 */
import { demoAdapter as db } from '../src/lib/data/demo/index'
import { store } from '../src/lib/data/demo/store'

const usd = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const pct = (n: number) => `${n.toFixed(2)}%`

const st = store.get()
const pnl = await db.getPnl(6)
const sales = st.sales_days
const first = sales[0]?.business_date
const last = sales[sales.length - 1]?.business_date

console.log(`demo date          : ${st.today}`)
console.log(`sales_days         : ${sales.length} rows, ${first} → ${last}`)
console.log(`expenses           : ${st.expenses.length} rows`)
console.log(`labor_costs        : ${st.labor_costs.length} weeks`)
console.log(`waste_log          : ${st.waste_log.length} rows`)
console.log(`orders / items     : ${st.orders.length} / ${st.order_items.length}`)
console.log()

const head = [
  'month'.padEnd(8),
  'revenue'.padStart(12),
  'cogs'.padStart(12),
  'labor'.padStart(12),
  'overhead'.padStart(12),
  'net'.padStart(12),
  'food%'.padStart(8),
  'labor%'.padStart(8),
  'prime%'.padStart(8),
  'net%'.padStart(8),
].join(' ')
console.log(head)
console.log('-'.repeat(head.length))

for (const r of pnl) {
  const prime = r.revenueCents
    ? ((r.cogsCents + r.laborCents) / r.revenueCents) * 100
    : 0
  console.log(
    [
      r.month.padEnd(8),
      usd(r.revenueCents).padStart(12),
      usd(r.cogsCents).padStart(12),
      usd(r.laborCents).padStart(12),
      usd(r.overheadCents).padStart(12),
      usd(r.netProfitCents).padStart(12),
      pct(r.foodCostPct).padStart(8),
      pct(r.laborPct).padStart(8),
      pct(prime).padStart(8),
      pct(r.netMarginPct).padStart(8),
    ].join(' '),
  )
}

console.log()
const totals = pnl.reduce(
  (a, r) => ({
    revenue: a.revenue + r.revenueCents,
    cogs: a.cogs + r.cogsCents,
    labor: a.labor + r.laborCents,
    overhead: a.overhead + r.overheadCents,
    net: a.net + r.netProfitCents,
  }),
  { revenue: 0, cogs: 0, labor: 0, overhead: 0, net: 0 },
)
console.log(
  [
    'TOTAL'.padEnd(8),
    usd(totals.revenue).padStart(12),
    usd(totals.cogs).padStart(12),
    usd(totals.labor).padStart(12),
    usd(totals.overhead).padStart(12),
    usd(totals.net).padStart(12),
    pct((totals.cogs / totals.revenue) * 100).padStart(8),
    pct((totals.labor / totals.revenue) * 100).padStart(8),
    pct(((totals.cogs + totals.labor) / totals.revenue) * 100).padStart(8),
    pct((totals.net / totals.revenue) * 100).padStart(8),
  ].join(' '),
)

console.log('\nNOTE: partial months at each end of the 90-day window are')
console.log('partial by construction — the fixed monthly overheads land in')
console.log('full while only part of the month has sales behind them.')
