'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import type { ChannelRow } from '@/lib/admin/reporting'

const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: 'var(--chart-grid)' },
} as const

const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--line-strong)',
    borderRadius: 8,
    color: 'var(--ink)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--ink-muted)' },
} as const

const shortDate = (iso: string, locale: Locale) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

/**
 * Sales by channel, stacked.
 *
 * Four series, four fixed slots, assigned in order and never cycled.
 * Each segment carries a 2px surface-colored stroke so touching fills
 * read as separate bands rather than one smear — the spacer is what
 * makes a stack legible, especially under colorblind simulation.
 */
export function ChannelMixChart({
  data,
  locale,
}: {
  data: ChannelRow[]
  locale: Locale
}) {
  const t = useTranslations('admin')
  const reduced = useReducedMotion()

  const series = [
    { key: 'counterCents', label: t('channel.counter'), token: '--chart-1' },
    { key: 'onlineCents', label: t('channel.online'), token: '--chart-2' },
    { key: 'wholesaleCents', label: t('channel.wholesale'), token: '--chart-3' },
    { key: 'marketplaceCents', label: t('channel.marketplace'), token: '--chart-4' },
  ]

  return (
    <ChartFrame
      title={t('chart.channelTitle')}
      description={t('chart.channelDesc')}
      series={series.map((s) => ({ key: s.key, label: s.label, token: s.token }))}
      columns={[t('chart.date'), ...series.map((s) => s.label)]}
      rows={data.map((d) => [
        shortDate(d.businessDate, locale),
        formatMoney(d.counterCents, locale),
        formatMoney(d.onlineCents, locale),
        formatMoney(d.wholesaleCents, locale),
        formatMoney(d.marketplaceCents, locale),
      ])}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            {...tooltipStyle}
            labelFormatter={(v: string) => shortDate(v, locale)}
            formatter={(value: number, key: string) => [
              formatMoney(value, locale),
              series.find((s) => s.key === key)?.label ?? key,
            ]}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stackId="channels"
              stroke="var(--surface)"
              strokeWidth={2}
              fill={`var(${s.token})`}
              fillOpacity={1}
              isAnimationActive={!reduced}
              animationDuration={400}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/**
 * Top products by contribution margin.
 *
 * Nominal categories — swapping two rows would not change the meaning —
 * so every bar takes the SAME slot-1 hue. Coloring each bar differently
 * would spend the identity channel re-encoding what bar length already
 * shows, and there is no legend because the title names the series.
 */
export function TopProductsChart({
  data,
  locale,
}: {
  data: { sku: string; name: string; contributionCents: number; marginPct: number | null }[]
  locale: Locale
}) {
  const t = useTranslations('admin')
  const reduced = useReducedMotion()

  return (
    <ChartFrame
      title={t('chart.topProductsTitle')}
      description={t('chart.topProductsDesc')}
      series={[{ key: 'contribution', label: t('chart.contribution'), token: '--chart-1' }]}
      columns={[t('chart.product'), t('chart.contribution'), t('chart.marginPct')]}
      rows={data.map((d) => [
        d.name,
        formatMoney(d.contributionCents, locale),
        d.marginPct === null ? '—' : `${d.marginPct.toFixed(2)}%`,
      ])}
    >
      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, bottom: 0, left: 8 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatMoney(v, locale)}
            {...axisProps}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number) => [formatMoney(value, locale), t('chart.contribution')]}
          />
          <Bar
            dataKey="contributionCents"
            fill="var(--chart-1)"
            radius={[0, 4, 4, 0]}
            isAnimationActive={!reduced}
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
