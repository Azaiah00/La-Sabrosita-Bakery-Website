/**
 * NOT WIRED. PROMPT-08 builds checkout; in this build the demo pay page
 * at `/pedido/pagar` stands in and charges nothing.
 *
 * Two rules for when this is wired: verify webhook signatures on the RAW
 * body, and guard idempotency on `event.id`.
 */
export function getStripe(): never {
  throw new Error('Stripe is not wired yet. Demo checkout lives at /pedido/pagar. See PROMPT-08.')
}
