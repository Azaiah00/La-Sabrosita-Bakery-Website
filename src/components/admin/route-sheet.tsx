import { getTranslations } from 'next-intl/server'
import type { Locale, RouteRow } from '@/lib/data/types'

/**
 * The route sheet.
 *
 * THIS IS A PRINTED DOCUMENT, not a screen. It rides in the van. Stops
 * are in delivery sequence, quantities are in cases, and every stop has
 * a signature line — the driver needs the store to sign for what came
 * off the rack.
 *
 * The print stylesheet is the deliverable; see `@media print` in
 * marketing.css.
 */
export async function RouteSheet({
  routes,
  dow,
  locale,
}: {
  routes: RouteRow[]
  dow: number
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'wholesale' })
  const days = await getTranslations({ locale, namespace: 'hours' })

  if (routes.length === 0) {
    return <p className="portal-empty">{t('noRoute')}</p>
  }

  return (
    <div className="route">
      {routes.map((route) => {
        // Aggregate per route, so the bakers know Tuesday needs 96
        // conchas for La Esperanza before anyone asks.
        const totals = new Map<string, { name: string; qty: number }>()
        for (const stop of route.stops) {
          for (const line of stop.lines) {
            const prev = totals.get(line.variantId)
            totals.set(line.variantId, {
              name: line.name,
              qty: (prev?.qty ?? 0) + line.qty,
            })
          }
        }

        return (
          <section key={route.route} className="route__block" aria-labelledby={`r-${route.route}`}>
            <header className="route__head">
              <h2 id={`r-${route.route}`} className="route__title">
                {route.route}
              </h2>
              <p className="route__day">{days(`days.${dow}` as 'days.0')}</p>
            </header>

            <ol className="route__stops">
              {route.stops.map((stop, i) => (
                <li key={stop.wholesaleAccountId} className="route__stop">
                  <div className="route__stop-head">
                    <span className="route__seq tabular">{i + 1}</span>
                    <span className="route__store">{stop.storeName}</span>
                    <span className="route__city">{stop.city}</span>
                  </div>

                  <table className="route__lines">
                    <caption className="visually-hidden">{stop.storeName}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('col_product')}</th>
                        <th scope="col">{t('col_cases')}</th>
                        <th scope="col">{t('col_check')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stop.lines.map((line) => (
                        <tr key={line.variantId}>
                          <th scope="row">{line.name}</th>
                          <td className="tabular">{line.qty}</td>
                          <td className="route__check" aria-hidden="true" />
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* The store signs for what came off the rack. */}
                  <p className="route__sign">
                    <span className="route__sign-line" aria-hidden="true" />
                    <span className="route__sign-label">{t('signature')}</span>
                  </p>
                </li>
              ))}
            </ol>

            <div className="route__totals">
              <h3 className="route__totals-title">{t('routeTotals')}</h3>
              <ul>
                {[...totals.values()]
                  .sort((a, b) => b.qty - a.qty)
                  .map((tot) => (
                    <li key={tot.name} className="tabular">
                      {tot.qty} × {tot.name}
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )
      })}
    </div>
  )
}
