import { db } from '@/lib/data'
import type { Locale } from '@/lib/data/types'

/**
 * Email goes through the data layer, not through Resend directly.
 *
 * In demo mode `db.sendMessage` captures it into the Mensajes drawer,
 * fully rendered, and nothing leaves the machine. After the sale the
 * Supabase adapter hands the same payload to Resend — and this signature
 * does not change.
 */
export async function sendEmail(args: {
  to: string
  subject: string
  html: string
  locale: Locale
  templateKey: string
  orderId?: string | null
}) {
  await db.sendMessage({
    channel: 'email',
    templateKey: args.templateKey,
    locale: args.locale,
    toAddress: args.to,
    subject: args.subject,
    body: args.html,
    orderId: args.orderId ?? null,
  })
}
