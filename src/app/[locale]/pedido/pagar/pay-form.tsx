'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { payDemoOrder } from './actions'
import type { Locale } from '@/lib/data/types'

/**
 * PROMPT-00 Part D — payments.
 *
 * The card fields below are DISABLED and pre-filled with the Stripe test
 * number. They accept no input, by design: never build a form that takes
 * a typed card number outside Stripe Elements, not even a fake one — it
 * teaches the wrong habit and someone eventually types a real number
 * into it.
 */
export function PayForm({
  orderId,
  locale,
  statusHref,
}: {
  orderId: string
  locale: Locale
  statusHref: string
}) {
  const t = useTranslations('demo')
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'processing' | 'done'>('idle')

  async function pay() {
    setState('processing')
    // A beat of latency, so the moment reads like a real authorisation.
    await new Promise((r) => setTimeout(r, 1200))
    await payDemoOrder(orderId, locale)
    setState('done')
    router.push(statusHref)
  }

  const cardFieldId = 'demo-card-number'

  return (
    <div className="pay">
      <div className="pay__card" aria-describedby="demo-card-note">
        <label className="pay__label" htmlFor={cardFieldId}>
          {t('payCardLabel')}
        </label>
        <input
          id={cardFieldId}
          className="pay__input tabular"
          value="4242 4242 4242 4242"
          disabled
          readOnly
          inputMode="none"
          autoComplete="off"
        />
        <div className="pay__row">
          <div>
            <label className="pay__label" htmlFor="demo-card-exp">
              {t('payExpiry')}
            </label>
            <input id="demo-card-exp" className="pay__input tabular" value="12 / 34" disabled readOnly />
          </div>
          <div>
            <label className="pay__label" htmlFor="demo-card-cvc">
              {t('payCvc')}
            </label>
            <input id="demo-card-cvc" className="pay__input tabular" value="123" disabled readOnly />
          </div>
        </div>
        <p id="demo-card-note" className="pay__note">
          {t('payCardNote')}
        </p>
      </div>

      <button
        type="button"
        className="btn btn--primary pay__button"
        onClick={() => void pay()}
        disabled={state !== 'idle'}
      >
        {state === 'processing' ? (
          <>
            <span className="pay__spinner" aria-hidden="true" />
            {t('payProcessing')}
          </>
        ) : state === 'done' ? (
          t('payDone')
        ) : (
          t('payButton')
        )}
      </button>

      {/* Small and honest. Never let anyone believe a card was charged. */}
      <p className="pay__disclaimer">{t('payNoCharge')}</p>

      <p aria-live="polite" className="visually-hidden">
        {state === 'processing' ? t('payProcessing') : state === 'done' ? t('payDone') : ''}
      </p>
    </div>
  )
}
