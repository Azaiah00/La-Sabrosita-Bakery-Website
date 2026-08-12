'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

const KEY = 'ls-announce-dismissed'

/**
 * Renders the active announcements row. --wheat background, --ink text
 * (8.53:1, AAA). Dismissible, dismissal kept in localStorage, and the
 * whole bar is absent from the DOM when there is no active row.
 *
 * Rendered hidden-until-checked rather than mounted-after-check so it
 * cannot shift the hero after paint (CLS budget is 0.05).
 */
export function AnnouncementBar({ body, href }: { body: string; href: string | null }) {
  const t = useTranslations('announce')
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(KEY) === body)
  }, [body])

  if (dismissed) return null

  return (
    <div className="announce" hidden={dismissed === null ? undefined : false}>
      {href ? (
        <a href={href} className="announce__body">
          {body}
        </a>
      ) : (
        <span className="announce__body">{body}</span>
      )}
      <button
        type="button"
        className="announce__dismiss"
        aria-label={t('dismiss')}
        onClick={() => {
          localStorage.setItem(KEY, body)
          setDismissed(true)
        }}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
