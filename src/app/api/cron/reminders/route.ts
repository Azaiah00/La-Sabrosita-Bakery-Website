import { NextResponse } from 'next/server'

/**
 * Pickup reminders — NOT WIRED. PROMPT-14 builds this.
 *
 * When it is, it must honour the quiet-hours window in the
 * `notifications` setting and must never send an SMS without a stamped
 * explicit opt-in.
 */
export async function GET() {
  return NextResponse.json({ error: 'Reminders cron not wired yet — see PROMPT-14' }, { status: 501 })
}
