'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/lib/data/types'

/** Reiniciar demo — the safety net. PROMPT-00 Part E. */
export function ResetButton() {
  const t = useTranslations('demo')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  async function reset() {
    await fetch('/api/demo/reset', { method: 'POST' })
    setDone(true)
    startTransition(() => {
      router.refresh()
      setTimeout(() => setDone(false), 2000)
    })
  }

  return (
    <button
      type="button"
      className="demo-banner__btn"
      onClick={() => void reset()}
      disabled={pending}
    >
      {done ? t('resetDone') : pending ? t('resetting') : t('reset')}
    </button>
  )
}

/**
 * ES | EN, right where you need it mid-pitch.
 *
 * On a public route the locale is in the path, so we swap the prefix. The
 * portal and admin carry no locale prefix — they read the NEXT_LOCALE
 * cookie the header toggle sets, so there we set the cookie and refresh.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const t = useTranslations('locale')
  const router = useRouter()

  function switchTo(next: Locale) {
    if (next === locale) return
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`

    const path = window.location.pathname
    const m = path.match(/^\/(es|en)(\/.*)?$/)
    if (m) {
      router.push(`/${next}${m[2] ?? ''}`)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="demo-banner__locales" role="group" aria-label={t('es') + ' / ' + t('en')}>
      {(['es', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className="demo-banner__btn demo-banner__btn--locale"
          aria-current={l === locale ? 'true' : undefined}
          onClick={() => switchTo(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
