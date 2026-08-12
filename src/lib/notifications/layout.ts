import { EMAIL_PALETTE as C } from '@/lib/email-palette'
import { BUSINESS } from '@/lib/constants'
import type { Locale } from '@/lib/data/types'

/** Escape anything interpolated into an email body. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${BUSINESS.street} ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}`,
)}`

/**
 * The shared email shell.
 *
 * Table-based, inline-styled, 600px — the three things that still
 * separate an email that renders in Outlook from one that does not.
 * `<meta charset>` is first so `Quesadilla Salvadoreña` survives a
 * client that guesses encodings.
 */
export function emailLayout({
  locale,
  preheader,
  body,
  showUnsubscribe = false,
}: {
  locale: Locale
  /** The line the inbox preview shows. Hidden in the body. */
  preheader: string
  body: string
  /** Marketing only. Transactional email must NOT carry one. */
  showUnsubscribe?: boolean
}): string {
  const t = locale === 'es'
    ? { call: 'Llámanos', unsub: 'Darte de baja de estos correos', from: 'La familia Ortega' }
    : { call: 'Call us', unsub: 'Unsubscribe from these emails', from: 'The Ortega family' }

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(preheader)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.surface};border:1px solid ${C.line};border-radius:14px;">
  <tr><td style="padding:24px 24px 8px;">
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${C.ink};">
      La Sabrosita Bakery
    </p>
  </td></tr>
  <tr><td style="padding:8px 24px 24px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.6;color:${C.ink};">
${body}
  </td></tr>
  <tr><td style="padding:16px 24px 24px;border-top:1px solid ${C.line};font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:${C.inkMuted};">
    <p style="margin:0 0 4px;">— ${t.from}</p>
    <p style="margin:0;">${BUSINESS.street} ${BUSINESS.unit}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}</p>
    <p style="margin:4px 0 0;">${t.call}: <a href="tel:${BUSINESS.phonePrimary}" style="color:${C.accentStrong};">${BUSINESS.phonePrimaryDisplay}</a></p>
${showUnsubscribe ? `    <p style="margin:12px 0 0;"><a href="{{unsubscribeUrl}}" style="color:${C.inkMuted};">${t.unsub}</a></p>` : ''}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/** A primary button that survives Outlook. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
<td style="background:${C.accentStrong};border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:12px 24px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;">${esc(label)}</a>
</td></tr></table>`
}
