'use client'

import { useId, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

export interface SeriesMeta {
  key: string
  label: string
  /** CSS custom property name, e.g. '--chart-1'. Never a literal color. */
  token: string
}

/**
 * The shell every chart sits in.
 *
 * Three things it guarantees, so no individual chart has to remember:
 *
 * 1. A LEGEND whenever there are two or more series — identity is never
 *    carried by color alone. A single-series chart gets none; the title
 *    names it.
 * 2. A VISUALLY-HIDDEN DATA TABLE with the same numbers. A dashboard a
 *    screen reader cannot read is not a dashboard, and PROMPT-12 makes
 *    this a hard requirement.
 * 3. Text in ink tokens. A label never wears its series color — the
 *    swatch beside it carries the identity.
 */
export function ChartFrame({
  title,
  description,
  series,
  columns,
  rows,
  children,
}: {
  title: string
  description?: string
  series: SeriesMeta[]
  /** Header cells for the text alternative. */
  columns: string[]
  /** Body rows for the text alternative, already formatted. */
  rows: string[][]
  children: ReactNode
}) {
  const t = useTranslations('admin')
  const id = useId()

  return (
    <figure className="chart" aria-labelledby={`${id}-t`}>
      <figcaption className="chart__head">
        <h3 id={`${id}-t`} className="chart__title">
          {title}
        </h3>
        {description && <p className="chart__desc">{description}</p>}
      </figcaption>

      {series.length > 1 && (
        <ul className="chart__legend">
          {series.map((s) => (
            <li key={s.key} className="chart__legend-item">
              <span
                className="chart__swatch"
                style={{ background: `var(${s.token})` }}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="chart__plot">{children}</div>

      <table className="visually-hidden">
        <caption>{t('tableAlt', { title })}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
