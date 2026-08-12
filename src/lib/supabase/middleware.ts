/**
 * NOT WIRED. Session refresh in middleware arrives with real auth in
 * PROMPT-09. In demo mode the staff role comes from a cookie set by the
 * role cards — see `src/lib/auth/role.ts`.
 */
export function updateSupabaseSession(): never {
  throw new Error('Supabase auth is not wired yet. See PROMPT-09.')
}
