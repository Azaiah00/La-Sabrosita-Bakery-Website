'use client'

/* =====================================================================
   PROMPT-00 Part D — the Mensajes drawer.

   sendMessage() in demo mode writes to the in-memory log instead of
   sending. This is where that log is read: every message that WOULD have
   gone out, fully rendered — the HTML email and the SMS text, in the
   customer's language, with a timestamp.

   This demos better than real email. It is instant, it shows both
   locales, and it cannot land in spam mid-pitch.
   ===================================================================== */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LoggedMessage } from '@/lib/data/types'

export function MessageLogDrawer({ initialCount }: { initialCount: number }) {
  const t = useTranslations('demo')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<LoggedMessage[]>([])
  const [count, setCount] = useState(initialCount)
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const load = useCallback(async () => {
    const res = await fetch('/api/demo/messages', { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { messages: LoggedMessage[] }
    setMessages(data.messages)
    setCount(data.messages.length)
  }, [])

  // Keep the badge honest without polling: refresh whenever the tab is
  // focused, which covers "place an order, come back to the pitch".
  useEffect(() => {
    void load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  useEffect(() => {
    if (!open) return
    void load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        openerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, load])

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="demo-banner__btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {t('messagesCount', { count })}
      </button>

      {open && (
        <div className="demo-drawer">
          {/* A real button, not a div with a click handler — click-outside
              has to be reachable from the keyboard too. */}
          <button
            type="button"
            className="demo-drawer__scrim"
            aria-label={t('close')}
            onClick={() => {
              setOpen(false)
              openerRef.current?.focus()
            }}
          />
          <div
            ref={panelRef}
            className="demo-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <div className="demo-drawer__head">
              <h2 id={titleId} className="demo-drawer__title">{t('drawerTitle')}</h2>
              <button
                type="button"
                className="btn btn--secondary demo-drawer__close"
                onClick={() => {
                  setOpen(false)
                  openerRef.current?.focus()
                }}
              >
                {t('close')}
              </button>
            </div>

            <p className="demo-drawer__intro">{t('drawerIntro')}</p>

            {messages.length === 0 ? (
              <p className="demo-drawer__empty">{t('drawerEmpty')}</p>
            ) : (
              <ol className="demo-drawer__list">
                {messages.map((m) => (
                  <li key={m.id} className="demo-message">
                    <div className="demo-message__meta">
                      <span className="demo-message__channel">
                        {m.channel === 'email' ? t('channelEmail') : t('channelSms')}
                      </span>
                      <span className="demo-message__locale">{m.locale.toUpperCase()}</span>
                      <time dateTime={m.loggedAt} className="demo-message__time">
                        {new Date(m.loggedAt).toLocaleString(m.locale === 'en' ? 'en-US' : 'es-US', {
                          timeZone: 'America/New_York',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </div>
                    <p className="demo-message__to">
                      <span className="demo-message__label">{t('to')}:</span> {m.toAddress}
                    </p>
                    {m.subject && (
                      <p className="demo-message__subject">
                        <span className="demo-message__label">{t('subject')}:</span> {m.subject}
                      </p>
                    )}
                    {m.channel === 'email' ? (
                      // Rendered in an iframe so the email's own styles cannot
                      // leak into the portal around it.
                      <iframe
                        title={m.subject ?? m.templateKey}
                        className="demo-message__frame"
                        sandbox=""
                        srcDoc={m.body}
                      />
                    ) : (
                      <pre className="demo-message__sms">{m.body}</pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  )
}
