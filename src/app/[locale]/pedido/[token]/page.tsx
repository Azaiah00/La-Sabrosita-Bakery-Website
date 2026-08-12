import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { db } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { formatLocal } from '@/lib/datetime'

type Params = Promise<{ locale: string; token: string }>

export const metadata = { robots: { index: false, follow: false } }

/**
 * Magic-link order status.
 *
 * In production the token is looked up SHA-256 hashed through
 * `get_order_by_token()` and nothing else. The adapter is what changes
 * after the sale; this page does not.
 */
export default async function OrderStatusPage({ params }: { params: Params }) {
  const { locale, token } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const order = await db.getOrderByToken(token)
  if (!order) notFound()

  const t = await getTranslations({ locale, namespace: 'pages' })

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('orderStatus')}</h1>
        <p className="page-head__intro">
          {order.orderNumber} · {order.status}
        </p>
      </header>

      {order.pickupAt && (
        <p className="order-pickup">
          {formatLocal(new Date(order.pickupAt), "EEEE d 'de' MMMM, HH:mm")}
        </p>
      )}

      <ul className="order-lines">
        {order.items.map((i) => (
          <li key={i.id} className="order-line">
            <span>
              {i.qty} × {i.nameSnapshot}
            </span>
            <span className="tabular">{formatMoney(i.lineTotalCents, locale)}</span>
          </li>
        ))}
      </ul>

      <p className="order-total tabular">{formatMoney(order.totalCents, locale)}</p>
    </main>
  )
}
