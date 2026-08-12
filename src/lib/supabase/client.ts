/**
 * NOT WIRED. PROMPT-00 Part G: the package is installed because later
 * prompts need it, but this build talks to no external service.
 *
 * Nothing outside `src/lib/data/supabase/` may import this file — every
 * page, component and action goes through `db` from `@/lib/data`.
 */
export function createBrowserSupabaseClient(): never {
  throw new Error('Supabase is not wired yet — go through `db` from @/lib/data. See PROMPT-02.')
}
