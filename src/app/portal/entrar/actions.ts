'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { IS_DEMO } from '@/lib/data'
import { ROLE_COOKIE, isRole, landingFor } from '@/lib/auth/role'

/**
 * Demo sign-in: one click, no credentials.
 *
 * The chosen role goes in a cookie and drives the SAME gating the real
 * build uses — so you can show the client, live, that counter staff
 * genuinely cannot reach the P&L.
 */
export async function signInAs(formData: FormData) {
  if (!IS_DEMO) throw new Error('Role cards are demo-only')

  const role = formData.get('role')
  if (!isRole(role)) throw new Error('Unknown role')

  const jar = await cookies()
  jar.set(ROLE_COOKIE, role, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
  })

  redirect(landingFor(role))
}

export async function signOut() {
  const jar = await cookies()
  jar.delete(ROLE_COOKIE)
  redirect('/portal/entrar')
}
