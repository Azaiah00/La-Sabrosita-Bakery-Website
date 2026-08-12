import { cookies } from 'next/headers'
import type { Locale, StaffRole } from '@/lib/data/types'

export const ROLE_COOKIE = 'demo_role'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

const ROLES: StaffRole[] = ['owner', 'manager', 'baker', 'decorator', 'counter']

export function isRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && ROLES.includes(value as StaffRole)
}

/**
 * The role the staff session is acting as.
 *
 * In demo mode this comes from the cookie the role cards set. After the
 * sale it comes from `staff_members.role` behind Supabase auth — and the
 * gating below does not change, because it never read the cookie
 * directly, only this function.
 */
export async function currentRole(): Promise<StaffRole | null> {
  const jar = await cookies()
  const value = jar.get(ROLE_COOKIE)?.value
  return isRole(value) ? value : null
}

/**
 * The staff-side locale.
 *
 * Follows the site default (English, by client direction — see the note
 * in `src/i18n/routing.ts`), overridden by the NEXT_LOCALE cookie the
 * banner toggle sets.
 *
 * WORTH REVISITING BEFORE LAUNCH: CLAUDE.md says the owner works in
 * Spanish, and the portal is the screen she uses every day. Flipping
 * this default back to 'es' is a one-word change if that turns out to be
 * true of the real users rather than of the demo audience.
 */
export async function staffLocale(): Promise<Locale> {
  const jar = await cookies()
  return jar.get(LOCALE_COOKIE)?.value === 'es' ? 'es' : 'en'
}

/**
 * Who may see the money.
 *
 * This is the demo's proof that role gating is real: sign in as
 * `counter` and /admin is genuinely closed, not just missing a link.
 * Hiding a button is not a permission — in production the same boundary
 * is enforced by RLS, and this check is the second lock, not the only one.
 */
export function canSeeAdmin(role: StaffRole | null): boolean {
  return role === 'owner' || role === 'manager'
}

export function landingFor(role: StaffRole): string {
  switch (role) {
    case 'owner':
    case 'manager':
      return '/admin'
    case 'baker':
    case 'decorator':
      return '/portal/produccion'
    case 'counter':
    default:
      return '/portal/pedidos'
  }
}
