import { StaffShell } from '@/components/portal/staff-shell'
import { PortalShell } from '@/components/portal/shell'
import { StaffTopBar } from '@/components/portal/staff-topbar'
import { staffLocale, currentRole } from '@/lib/auth/role'
import type { Viewport } from 'next'

export const metadata = { robots: { index: false, follow: false } }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const locale = await staffLocale()
  const role = await currentRole()

  // The sign-in page lives under /portal too, so an unauthenticated
  // visitor gets the bare document shell rather than a rail of links
  // they cannot use. Each page guards itself.
  if (!role) {
    return (
      <StaffShell locale={locale}>
        <StaffTopBar locale={locale} />
        {children}
      </StaffShell>
    )
  }

  return (
    <StaffShell locale={locale}>
      <PortalShell role={role} locale={locale}>
        {children}
      </PortalShell>
    </StaffShell>
  )
}
