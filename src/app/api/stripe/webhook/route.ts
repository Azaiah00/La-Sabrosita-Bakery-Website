import { NextResponse } from 'next/server'
import { IS_DEMO } from '@/lib/data'

/**
 * Stripe webhook — NOT WIRED. PROMPT-00 Part G: the package is installed
 * because PROMPT-08 needs it; nothing here talks to Stripe yet.
 *
 * When it is wired, two rules are non-negotiable:
 *   1. Verify the signature on the RAW body, before any JSON parsing.
 *   2. Guard idempotency on `event.id` — Stripe retries.
 *
 * Until then this refuses rather than pretending to accept, so a
 * misconfigured endpoint fails loudly instead of silently swallowing
 * payment events.
 */
export async function POST() {
  if (IS_DEMO) {
    return NextResponse.json(
      { error: 'Demo mode: no Stripe integration. Payments run through /pedido/pagar.' },
      { status: 501 },
    )
  }
  return NextResponse.json({ error: 'Stripe webhook not wired yet — see PROMPT-08' }, { status: 501 })
}
