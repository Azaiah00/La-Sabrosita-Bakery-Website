import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Store } from 'lucide-react'
import type { Locale } from '@/lib/data/types'

/** Minimal chrome for staff routes that do not use the portal shell. */
export async function StaffTopBar({
  locale,
  showPortalLink = false,
}: {
  locale: Locale
  showPortalLink?: boolean
}) {
  const portal = await getTranslations({ locale, namespace: 'portal' })
  const staff = await getTranslations({ locale, namespace: 'staff' })

  return (
    <header className="staff-topbar">
      <Link href="/" className="btn btn--secondary portal-head__website">
        <Store size={18} aria-hidden="true" className="portal-head__website-icon" />
        <span className="portal-head__website-label">{portal('backToWebsite')}</span>
      </Link>
      {showPortalLink && (
        <Link href="/portal" className="btn btn--ghost staff-topbar__portal">
          {staff('backToPortal')}
        </Link>
      )}
    </header>
  )
}
