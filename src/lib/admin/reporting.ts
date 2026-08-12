import { db } from '@/lib/data'
import { addBusinessDays } from '@/lib/datetime'
import type { MarginRow, Period, PnlRow, SalesDay } from '@/lib/data/types'

/**
 * The reporting layer.
 *
 * TypeScript FORMATS; it does not compute. Every aggregate here comes
 * out of the data layer — which is Postgres views in production and the
 * demo adapter's mirror of them today. Nothing in this file re-derives a
 * financial figure that the database already owns.
 */

export interface ChannelRow {
  businessDate: string
  counterCents: number
  onlineCents: number
  wholesaleCents: number
  marketplaceCents: number
}

export interface SalesTrendRow {
  businessDate: string
  grossCents: number
  /** Trailing 7-day mean. Null until there are seven days behind it. */
  movingAverageCents: number | null
}

export interface FoodCostRow {
  month: string
  foodCostPct: number
  laborPct: number
  primeCostPct: number
  isPartial: boolean
}

const spanDays: Record<Period, number> = {
  today: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

/** The window a period covers, and the equal window before it. */
export function periodWindow(today: string, period: Period) {
  const days = spanDays[period]
  const to = addBusinessDays(today, -1)
  const from = addBusinessDays(to, -(days - 1))
  const priorTo = addBusinessDays(from, -1)
  const priorFrom = addBusinessDays(priorTo, -(days - 1))
  return { from, to, priorFrom, priorTo, days }
}

/**
 * Sales by day with a trailing 7-day mean.
 *
 * The mean is a second series on the SAME axis as the bars — both are
 * dollars. Never a second y-scale.
 */
export function salesTrend(days: SalesDay[]): SalesTrendRow[] {
  return days.map((d, i) => {
    const window = days.slice(Math.max(0, i - 6), i + 1)
    return {
      businessDate: d.businessDate,
      grossCents: d.grossSalesCents,
      movingAverageCents:
        window.length === 7
          ? Math.round(window.reduce((sum, w) => sum + w.grossSalesCents, 0) / 7)
          : null,
    }
  })
}

/**
 * Channel mix. The counter is what is left after the channels that
 * report themselves — it is never stored separately.
 */
export function salesByChannel(days: SalesDay[]): ChannelRow[] {
  return days.map((d) => ({
    businessDate: d.businessDate,
    counterCents: Math.max(
      0,
      d.grossSalesCents -
        d.onlineTotalCents -
        d.wholesaleTotalCents -
        d.marketplaceTotalCents,
    ),
    onlineCents: d.onlineTotalCents,
    wholesaleCents: d.wholesaleTotalCents,
    marketplaceCents: d.marketplaceTotalCents,
  }))
}

/**
 * Top products by CONTRIBUTION margin — price minus food cost, in cents.
 *
 * Not margin percent: a 90%-margin concha at $1.75 contributes less per
 * unit than a 70%-margin cake slice at $6.99, and the kitchen's time is
 * the scarce resource.
 */
export function topProductsByMargin(rows: MarginRow[], limit = 10) {
  return rows
    .filter((r) => r.foodCost !== null)
    .map((r) => ({
      ...r,
      contributionCents: r.priceCents - Math.round((r.foodCost as number) * 100),
    }))
    .sort((a, b) => b.contributionCents - a.contributionCents)
    .slice(0, limit)
}

/**
 * A month is partial when the data does not cover it end to end.
 *
 * This matters more than it looks: a month with eleven days of sales
 * carries a full month of rent and payroll and reads as a collapse. It
 * is arithmetic, not a business problem, and the P&L says so.
 */
export function markPartialMonths(
  rows: PnlRow[],
  firstDate: string,
  lastDate: string,
): (PnlRow & { isPartial: boolean })[] {
  return rows.map((r) => {
    const monthStart = `${r.month}-01`
    const [y, m] = r.month.split('-').map(Number)
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
    return { ...r, isPartial: monthStart < firstDate || monthEnd > lastDate }
  })
}

export async function getDashboardData(period: Period) {
  const business = await db.getBusiness()
  const today = new Date().toISOString().slice(0, 10)
  const win = periodWindow(today, period)

  const [current, prior, kpis, pnl, commission, margins] = await Promise.all([
    db.getSalesDays(win.from, win.to),
    db.getSalesDays(win.priorFrom, win.priorTo),
    db.getKpis(period),
    db.getPnl(6),
    db.getCommissionSaved(),
    db.getMarginTable(),
  ])

  const allDays = await db.getSalesDays('0000-01-01', '9999-12-31')
  const firstDate = allDays[0]?.businessDate ?? win.from
  const lastDate = allDays[allDays.length - 1]?.businessDate ?? win.to

  const priorRevenue = prior.reduce((s, d) => s + d.grossSalesCents, 0)
  const currentRevenue = current.reduce((s, d) => s + d.grossSalesCents, 0)

  return {
    business,
    window: win,
    kpis,
    revenueDeltaPct:
      priorRevenue > 0
        ? Math.round(((currentRevenue - priorRevenue) / priorRevenue) * 1000) / 10
        : null,
    trend: salesTrend(current),
    channels: salesByChannel(current),
    pnl: markPartialMonths(pnl, firstDate, lastDate),
    commission,
    topProducts: topProductsByMargin(margins),
  }
}

/** CSV with a UTF-8 BOM, so `Quesadilla Salvadoreña` survives Excel. */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '﻿'
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return (
    '﻿' +
    [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n')
  )
}
