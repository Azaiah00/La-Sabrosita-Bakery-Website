'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/data'
import { currentRole } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import type { WholesaleStatus } from '@/lib/data/types'

/**
 * Approve, suspend or close a wholesale account.
 *
 * Approving assigns the default price list and stamps `approved_at`, so
 * the account appears on its route sheet from the next render — which
 * is the demo moment: approve Carnicería Los Primos, open the route
 * sheet, and it is on the van.
 *
 * The production version also creates the auth user, inserts a hashed
 * `wholesale_invite` token with a 14-day expiry, emails the setup link,
 * and writes an audit row. None of those exist in demo mode, and the
 * screen says so rather than implying an email went out.
 */
export async function setAccountStatus(id: string, status: WholesaleStatus) {
  const role = await currentRole()
  if (!can(role, 'admin')) throw new Error('Not permitted')

  await db.setWholesaleAccountStatus(id, status)

  revalidatePath('/admin/mayoreo', 'page')
  revalidatePath('/admin/mayoreo/rutas', 'page')
  return { ok: true as const }
}
