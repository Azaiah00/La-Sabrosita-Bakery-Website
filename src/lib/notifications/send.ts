import { db } from '@/lib/data'
import { formatLocal } from '@/lib/datetime'
import type { Locale, MessageChannel } from '@/lib/data/types'
import type { TemplateKey } from './templates'

/* =====================================================================
   The gate every notification passes through.
   ---------------------------------------------------------------------
   Four rules, all of them non-negotiable:

   1. NO SMS WITHOUT A STAMPED, EXPLICIT OPT-IN.
   2. NO REMINDER DURING QUIET HOURS. "Your order is ready" is exempt —
      it is time-critical and expected; a 9pm marketing text is not.
   3. NO MARKETING TO A TRANSACTIONAL-ONLY OPT-IN.
   4. EXACTLY ONE LOG ROW PER SEND, and an idempotency key so running a
      job twice does not send twice.

   In demo mode `db.sendMessage` captures into the Mensajes drawer and
   nothing leaves the machine. The rules still run — they are the point,
   and they are what the Supabase adapter will inherit unchanged.
   ===================================================================== */

/** Templates that may go out inside quiet hours. */
const QUIET_HOURS_EXEMPT: TemplateKey[] = ['order_ready', 'order_confirmed', 'cake_confirmed']

/** Templates that are marketing, not transactional. */
const MARKETING: TemplateKey[] = ['review_request']

export type SendDecision =
  | { send: true }
  | { send: false; reason: 'no_sms_opt_in' | 'quiet_hours' | 'no_email_opt_in' | 'duplicate' }

export interface SendContext {
  templateKey: TemplateKey
  channel: MessageChannel
  locale: Locale
  toAddress: string
  orderId?: string | null
  /** Stamped consent. An SMS without this never goes. */
  smsOptInAt?: string | null
  emailOptIn?: boolean
  /** The instant the send is being attempted. Injected, never read here. */
  now: Date
}

export interface QuietHours {
  start: string
  end: string
}

/**
 * Is `now` inside the quiet window?
 *
 * The window wraps midnight (21:00 → 08:00), so this is a "not between"
 * test, not a simple range. Evaluated in Richmond wall-clock time — a
 * customer's phone buzzing at 4am because the server ran in UTC is
 * exactly the failure this prevents.
 */
export function inQuietHours(now: Date, hours: QuietHours): boolean {
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const nowMin = minutes(formatLocal(now, 'HH:mm'))
  const start = minutes(hours.start)
  const end = minutes(hours.end)

  return start > end ? nowMin >= start || nowMin < end : nowMin >= start && nowMin < end
}

/** The idempotency key. One send per template, per recipient, per order. */
export function idempotencyKey(ctx: SendContext): string {
  return [ctx.templateKey, ctx.channel, ctx.orderId ?? '-', ctx.toAddress].join('|')
}

/**
 * Decide whether this message may go out. Pure — no I/O, so it is
 * testable without a clock or a database.
 */
export function decide(
  ctx: SendContext,
  hours: QuietHours,
  alreadySent: Set<string>,
): SendDecision {
  if (alreadySent.has(idempotencyKey(ctx))) return { send: false, reason: 'duplicate' }

  if (ctx.channel === 'sms') {
    // Rule 1. No stamp, no send. The schema enforces the same thing.
    if (!ctx.smsOptInAt) return { send: false, reason: 'no_sms_opt_in' }
  }

  if (MARKETING.includes(ctx.templateKey)) {
    // Rule 3. A transactional opt-in is not permission to market.
    if (ctx.channel === 'email' && !ctx.emailOptIn) {
      return { send: false, reason: 'no_email_opt_in' }
    }
  }

  // Rule 2.
  if (!QUIET_HOURS_EXEMPT.includes(ctx.templateKey) && inQuietHours(ctx.now, hours)) {
    return { send: false, reason: 'quiet_hours' }
  }

  return { send: true }
}

/** The quiet window from `settings.notifications`. */
export async function getQuietHours(): Promise<QuietHours> {
  const settings = (await db.getSettings('notifications')) as {
    quiet_hours_start?: string
    quiet_hours_end?: string
  } | null
  return {
    start: settings?.quiet_hours_start ?? '21:00',
    end: settings?.quiet_hours_end ?? '08:00',
  }
}

export interface SendResult {
  sent: boolean
  reason?: SendDecision extends { send: false; reason: infer R } ? R : never
}

/**
 * Send — or decline to, and say why.
 *
 * Exactly one log row per actual send. A declined message writes
 * nothing: the drawer shows what WOULD have gone out, and something
 * that was correctly withheld did not go out.
 */
export async function send(
  ctx: SendContext,
  payload: { subject?: string | null; body: string },
): Promise<SendResult> {
  const hours = await getQuietHours()
  const existing = await db.listMessages()
  const alreadySent = new Set(
    existing.map((m) =>
      idempotencyKey({
        templateKey: m.templateKey as TemplateKey,
        channel: m.channel,
        orderId: m.orderId,
        toAddress: m.toAddress,
        locale: m.locale,
        now: ctx.now,
      }),
    ),
  )

  const decision = decide(ctx, hours, alreadySent)
  if (!decision.send) {
    return { sent: false, reason: decision.reason as never }
  }

  await db.sendMessage({
    channel: ctx.channel,
    templateKey: ctx.templateKey,
    locale: ctx.locale,
    toAddress: ctx.toAddress,
    subject: payload.subject ?? null,
    body: payload.body,
    orderId: ctx.orderId ?? null,
  })

  return { sent: true }
}
