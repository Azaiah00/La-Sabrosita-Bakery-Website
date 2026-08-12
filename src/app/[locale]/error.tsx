'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('errorTitle')}</h1>
        <p className="page-head__intro">{t('errorBody')}</p>
      </header>
      <p>
        <button type="button" className="btn btn--primary" onClick={reset}>
          {t('retry')}
        </button>
      </p>
    </main>
  )
}
