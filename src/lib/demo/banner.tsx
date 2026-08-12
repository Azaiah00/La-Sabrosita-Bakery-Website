/* =====================================================================
   PROMPT-00 Part E — the demo banner.

   A persistent, unmissable strip on EVERY route, including the portal
   and admin. Non-negotiable for three reasons:

   1. It is honest. Nobody walks away thinking the prices or the sales
      figures on screen are their real numbers.
   2. "Reiniciar demo" is the safety net when something gets fat-fingered
      in front of the client.
   3. Mensajes and the language toggle are right where you need them
      mid-pitch.

   In a non-demo build this component renders nothing at all.
   ===================================================================== */

import { getTranslations } from 'next-intl/server'
import { db, IS_DEMO } from '@/lib/data'
import type { Locale } from '@/lib/data/types'
import { MessageLogDrawer } from './message-log'
import { ResetButton, LocaleToggle } from './banner-controls'

export async function DemoBanner({ locale }: { locale: Locale }) {
  if (!IS_DEMO) return null

  const t = await getTranslations({ locale, namespace: 'demo' })
  const messages = await db.listMessages()

  return (
    <div className="demo-banner" role="region" aria-label={t('label')}>
      <p className="demo-banner__text">
        <strong className="demo-banner__label">{t('label')}</strong>
        <span className="demo-banner__note"> — {t('note')}</span>
      </p>
      <div className="demo-banner__controls">
        <MessageLogDrawer initialCount={messages.length} />
        <ResetButton />
        <LocaleToggle locale={locale} />
      </div>
    </div>
  )
}
