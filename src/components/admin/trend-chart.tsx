'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslations } from 'next-intl'
import { formatMoney } from '@/lib/money'
import { useReducedMotion } from '@/components/motion/use-reduced-motion'
import { ChartFrame } from './chart-frame'
import type { Locale } from '@/lib/data/types'
import type { FoodCostRow, SalesTrendRow } from '@/lib/admin/reporting'

/* Shared axis styling — recessive, so the data reads first. */
const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: 'var(--chart-grid)' },
} as const

function tooltipStyle() {
  return {
    contentStyle: {
      background: 'var(--surface)',
      border: '1px solid var(--line-strong)',
      borderRadius: 8,
      color: 'var(--ink)',
      fontSize: 13,
    },
    labelStyle: { color: 'var(--ink-muted)' },
    cursor: { fill: 'var(--surface-sunk)' },
  }
}

const shortDate = (iso: string, locale: Locale) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

/**
 * Sales by day, with a trailing 7-day mean.
 *
 * Bars and line share ONE y-axis because both are dollars — a second
 * scale would let the two series be posed into any relationship you
 * like, which is the single most common charting lie.
 */
export function SalesTrendChart({
  data,
  locale,
}: {
  data: SalesTrendRow[]
  locale: Locale
}) {
  const t = useTranslations('admin')
  const reduced = useReducedMotion()

  return (
    <ChartFrame
      title={t('chart.salesTitle')}
      description={t('chart.salesDesc')}
      series={[
        { key: 'gross', label: t('chart.grossSales'), token: '--chart-1' },
        { key: 'ma', label: t('chart.movingAverage'), token: '--chart-2' },
      ]}
      columns={[t('chart.date'), t('chart.grossSales'), t('chart.movingAverage')]}
      rows={data.map((d) => [
        shortDate(d.businessDate, locale),
        formatMoney(d.grossCents, locale),
        d.movingAverageCents === null ? '—' : formatMoney(d.movingAverageCents, locale),
      ])}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="businessDate"
            tickFormatter={(v: string) => shortDate(v, locale)}
            minTickGap={24}
            {...axisProps}
          />
          <YAxis
            tickFormatter={(v: number) =>
              new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
                notation: 'compact',
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(v / 100)
            }
            width={64}
            {...axisProps}
          />
          <Tooltip
            {...tooltipStyle()}
            labelFormatter={(v: string) => shortDate(v, locale)}
            formatter={(value: number, key: string) => [
              formatMoney(value, locale),
              key === 'grossCents' ? t('chart.grossSales') : t('chart.movingAverage'),
            ]}
          />
          {/* 4px rounded data-end, anchored to the baseline. */}
          <Bar
            dataKey="grossCents"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={!reduced}
            animationDuration={400}
          />
          <Line
            type="monotone"
            dataKey="movingAverageCents"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={!reduced}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/**
 * Food cost % over time with the 25–35% reference band shaded.
 *
 * The band is an INDUSTRY RULE OF THUMB, not a verdict on this bakery —
 * the caption says so, because a shaded "healthy" band with no caveat
 * reads as a diagnosis.
 */
export function FoodCostChart({
  data,
  locale,
}: {
  data: FoodCostRow[]
  locale: Locale
}) {
  const t = useTranslations('admin')
  const reduced = useReducedMotion()
  const pct = (n: number) => `${n.toFixed(1)}%`

  return (
    <ChartFrame
      title={t('chart.foodCostTitle')}
      description={t('chart.foodCostDesc')}
      series={[
        { key: 'food', label: t('chart.foodCostPct'), token: '--chart-1' },
        { key: 'labor', label: t('chart.laborPct'), token: '--chart-2' },
      ]}
      columns={[t('chart.month'), t('chart.foodCostPct'), t('chart.laborPct'), t('chart.primePct')]}
      rows={data.map((d) => [
        new Date(`${d.month}-01T12:00:00Z`).toLocaleDateString(
          locale === 'es' ? 'es-US' : 'en-US',
          { month: 'long', year: 'numeric', timeZone: 'UTC' },
        ) + (d.isPartial ? ` (${t('partial')})` : ''),
        pct(d.foodCostPct),
        pct(d.laborPct),
        pct(d.primeCostPct),
      ])}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          {/* The 25–35% band a healthy independent bakery runs in. */}
          <ReferenceArea y1={25} y2={35} fill="var(--chart-band)" strokeOpacity={0} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            width={48}
            domain={[0, 'dataMax + 10']}
            {...axisProps}
          />
          <Tooltip
            {...tooltipStyle()}
            formatter={(value: number, key: string) => [
              pct(value),
              key === 'foodCostPct' ? t('chart.foodCostPct') : t('chart.laborPct'),
            ]}
          />
          <Line
            type="monotone"
            dataKey="foodCostPct"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
            isAnimationActive={!reduced}
            animationDuration={400}
          />
          <Line
            type="monotone"
            dataKey="laborPct"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
            isAnimationActive={!reduced}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
