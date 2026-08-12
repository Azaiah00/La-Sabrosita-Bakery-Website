import type { StaffRole } from '@/lib/data/types'

/**
 * What each role can reach in the portal.
 *
 * This drives the nav and the guards. It is NOT the permission model —
 * RLS is, and it enforces the same boundaries at the database whatever
 * the UI does. Hiding a button is not a permission; this table just
 * stops a baker from being shown a screen that would refuse them anyway.
 */
export const CAPABILITIES = {
  orders: ['counter', 'baker', 'decorator', 'manager', 'owner'],
  ordersWrite: ['counter', 'manager', 'owner'],
  production: ['baker', 'manager', 'owner'],
  waste: ['baker', 'counter', 'manager', 'owner'],
  eightySix: ['counter', 'baker', 'manager', 'owner'],
  cakeTickets: ['decorator', 'baker', 'manager', 'owner'],
  admin: ['manager', 'owner'],
} as const satisfies Record<string, readonly StaffRole[]>

export type Capability = keyof typeof CAPABILITIES

export function can(role: StaffRole | null, capability: Capability): boolean {
  if (!role) return false
  return (CAPABILITIES[capability] as readonly StaffRole[]).includes(role)
}

export interface NavItem {
  href: string
  key: 'today' | 'orders' | 'production' | 'waste' | 'eightySix' | 'admin'
  capability: Capability | null
}

export const PORTAL_NAV: NavItem[] = [
  { href: '/portal', key: 'today', capability: null },
  { href: '/portal/pedidos', key: 'orders', capability: 'orders' },
  { href: '/portal/produccion', key: 'production', capability: 'production' },
  { href: '/portal/menu-86', key: 'eightySix', capability: 'eightySix' },
  { href: '/portal/merma', key: 'waste', capability: 'waste' },
  { href: '/admin', key: 'admin', capability: 'admin' },
]

export function navFor(role: StaffRole | null): NavItem[] {
  return PORTAL_NAV.filter((item) => item.capability === null || can(role, item.capability))
}
