'use client'

import { useTransition } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/lib/data/types'

/**
 * DESIGN.md §6 / PROMPT-03: two pills, ES / EN, --radius-pill, the active
 * one filled --accent with --accent-ink.
 *
 * This is a REAL ROUTE CHANGE through next-intl's `pathnames` map, not a
 * client-side string swap — `/en/cakes/order` becomes
 * `/es/pasteles/pedir`, and the visitor stays on the page they were on.
 * The choice is written to a NEXT_LOCALE cookie so the middleware honours
 * it next time.
 */
export function LanguageToggle({ current }: { current: Locale }) {
  const t = useTranslations('a11y')
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [pending, startTransition] = useTransition()

  function switchTo(next: Locale) {
    if (next === current) return
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`
    startTransition(() => {
      // `pathname` here is the internal template (e.g. '/pasteles/pedir');
      // next-intl resolves it to the right slug for the target locale.
      router.replace(
        // @ts-expect-error -- params carries the dynamic segments verbatim
        { pathname, params },
        { locale: next },
      )
    })
  }

  return (
    <div className="lang" role="group" aria-label={t('languageSwitcher')}>
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          className="lang__pill"
          aria-current={locale === current ? 'true' : undefined}
          disabled={pending}
          onClick={() => switchTo(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
