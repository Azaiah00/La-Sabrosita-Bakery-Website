/* =====================================================================
   supabaseAdapter — the real one. Wired after the sale.
   ---------------------------------------------------------------------
   Deliberately a stub. Nothing in this build touches Supabase: no
   project, no keys, no network. Every method throws the same clear error
   so a mis-set NEXT_PUBLIC_DEMO_MODE fails loudly at the call site
   instead of silently returning an empty menu.

   When the sale closes, this file implements BakeryData against the
   schema in supabase/migrations/0001_schema.sql — same shapes, same
   field names, so nothing upstream changes.
   ===================================================================== */

import type { BakeryData } from '../types'

const NOT_WIRED = 'Supabase adapter not wired yet — see PROMPT-02'

function notWired(method: string): never {
  throw new Error(`${NOT_WIRED} (called ${method})`)
}

/**
 * A Proxy rather than 40 hand-written throwing methods: it cannot drift
 * out of sync with the interface, and it names the method that was
 * called, which is what you actually want in the stack trace.
 */
export const supabaseAdapter: BakeryData = new Proxy({} as BakeryData, {
  get(_target, prop) {
    return () => notWired(String(prop))
  },
})
