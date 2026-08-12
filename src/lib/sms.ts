import { db } from '@/lib/data'
import type { Locale } from '@/lib/data/types'

/**
 * SMS goes through the data layer, not through Twilio directly.
 *
 * Two hard rules that survive the switch to a real sender: never send
 * without a stamped explicit opt-in, and never send inside the
 * quiet-hours window in the `notifications` setting. Both are enforced
 * by the caller (PROMPT-14) — this function only carries the payload.
 */
export async function sendSms(args: {
  to: string
  body: string
  locale: Locale
  templateKey: string
  orderId?: string | null
}) {
  await db.sendMessage({
    channel: 'sms',
    templateKey: args.templateKey,
    locale: args.locale,
    toAddress: args.to,
    body: args.body,
    orderId: args.orderId ?? null,
  })
}
