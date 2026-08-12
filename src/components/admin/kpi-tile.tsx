import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

/**
 * A KPI tile. Not a chart — a headline number with one comparison.
 *
 * The delta arrow is paired with a sign and a label, never carried by
 * color alone, and "up" is not automatically green: a rise in food cost
 * is bad news. `goodDirection` says which way is good and the tile
 * colors from that.
 */
export function KpiTile({
  label,
  value,
  deltaPct,
  goodDirection = 'up',
  hint,
}: {
  label: string
  value: string
  deltaPct?: number | null
  goodDirection?: 'up' | 'down' | 'neutral'
  hint?: string
}) {
  const dir = deltaPct == null || deltaPct === 0 ? 'flat' : deltaPct > 0 ? 'up' : 'down'
  const tone =
    goodDirection === 'neutral' || dir === 'flat'
      ? 'neutral'
      : dir === goodDirection
        ? 'good'
        : 'bad'

  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus

  return (
    <div className="kpi">
      <p className="kpi__label">{label}</p>
      <p className="kpi__value tabular">{value}</p>
      {deltaPct != null && (
        <p className="kpi__delta tabular" data-tone={tone}>
          <Icon aria-hidden="true" className="kpi__arrow" />
          {deltaPct > 0 ? '+' : ''}
          {deltaPct.toFixed(1)}%
          {hint && <span className="kpi__hint"> {hint}</span>}
        </p>
      )}
    </div>
  )
}
