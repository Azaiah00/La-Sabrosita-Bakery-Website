/**
 * NOT WIRED. See `client.ts`. Every read and write goes through `db`
 * from `@/lib/data`, which switches on NEXT_PUBLIC_DEMO_MODE.
 */
export function createServerSupabaseClient(): never {
  throw new Error('Supabase is not wired yet — go through `db` from @/lib/data. See PROMPT-02.')
}
