import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { db } from '@/lib/data'
import { formatMoney } from '@/lib/money'
import { formatLocal } from '@/lib/datetime'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!can(role, 'orders')) redirect('/portal')

  const { id } = await params
  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  const order = await db.getOrder(id)
  if (!order) notFound()

  const balance = order.totalCents - order.amountPaidCents

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{order.orderNumber}</h1>
        <p className="page-head__intro">
          {order.pickupAt
            ? formatLocal(new Date(order.pickupAt), "EEEE d 'de' MMMM · HH:mm")
            : '—'}
        </p>
      </header>

      {/* The ticket. Printable at 4x6 and 8.5x11 — see the print rules. */}
      <article className="ticket">
        <p className="ticket__number tabular">{order.orderNumber}</p>
        <p className="ticket__type">{t(`type_${order.orderType}`)}</p>

        <dl className="ticket__grid">
          <div>
            <dt>{t('customer')}</dt>
            <dd>
              {order.contactName}
              <br />
              {order.contactPhone}
            </dd>
          </div>
          <div>
            <dt>{t('pickup')}</dt>
            <dd className="tabular">
              {order.pickupAt
                ? formatLocal(new Date(order.pickupAt), "EEEE d 'de' MMMM · HH:mm")
                : '—'}
            </dd>
          </div>
        </dl>

        <ul className="ticket__lines">
          {order.items.map((i) => (
            <li key={i.id}>
              <span className="tabular">{i.qty} ×</span> {i.nameSnapshot}
              <span className="ticket__line-total tabular">
                {formatMoney(i.lineTotalCents, locale)}
              </span>
            </li>
          ))}
        </ul>

        {order.customerNote && (
          <div className="ticket__spec">
            <p className="ticket__label">{t('spec')}</p>
            {/*
              The inscription is reproduced EXACTLY as the customer typed
              it. `Felices 15, Sofía` never becomes `Felices 15, Sofia` —
              it is somebody's name on somebody's cake.
            */}
            <p className="ticket__inscription" lang={order.locale}>
              {order.customerNote}
            </p>
          </div>
        )}

        {order.allergyNote && (
          <div className="ticket__allergy">
            <p className="ticket__label">{t('allergy')}</p>
            <p>{order.allergyNote}</p>
          </div>
        )}

        <dl className="ticket__money">
          <div>
            <dt>{t('total')}</dt>
            <dd className="tabular">{formatMoney(order.totalCents, locale)}</dd>
          </div>
          <div>
            <dt>{t('paidLabel')}</dt>
            <dd className="tabular">{formatMoney(order.amountPaidCents, locale)}</dd>
          </div>
          <div>
            <dt>{t('balance')}</dt>
            <dd className="tabular">{formatMoney(Math.max(0, balance), locale)}</dd>
          </div>
        </dl>
      </article>

      <p className="admin-more portal-noprint">
        <Link href="/portal/pedidos" className="btn btn--secondary">
          {t('backToOrders')}
        </Link>
      </p>
    </main>
  )
}
