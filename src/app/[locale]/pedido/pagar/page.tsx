import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/routing'
import { db, IS_DEMO } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { formatLocal } from '@/lib/datetime'
import { PayForm } from './pay-form'

type Params = Promise<{ locale: string }>
type Search = Promise<{ pedido?: string }>

export const metadata = { robots: { index: false, follow: false } }

/**
 * The demo checkout. Gated behind IS_DEMO — in a non-demo build this
 * route 404s and Stripe Checkout takes over (PROMPT-08).
 */
export default async function DemoPayPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  if (!IS_DEMO) notFound()

  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const { pedido } = await searchParams
  const order = pedido ? await db.getOrder(pedido) : null
  if (!order) notFound()

  const t = await getTranslations({ locale, namespace: 'demo' })
  const depositCents = order.depositDueCents > 0 ? order.depositDueCents : order.totalCents

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('payTitle')}</h1>
        <p className="page-head__intro">{order.orderNumber}</p>
      </header>

      <section className="pay-summary" aria-label={order.orderNumber}>
        {order.pickupAt && (
          <p className="pay-summary__pickup">
            {formatLocal(new Date(order.pickupAt), "EEEE d 'de' MMMM · HH:mm")}
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
        <p className="order-line order-line--total">
          <span>{order.depositDueCents > 0 ? t('payDeposit') : t('payTotal')}</span>
          <span className="tabular">{formatMoney(depositCents, locale)}</span>
        </p>
      </section>

      <PayForm
        orderId={order.id}
        locale={locale}
        statusHref={`/${locale}/pedido/${order.orderNumber}`}
      />
    </main>
  )
}
