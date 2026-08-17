import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ClipboardList, Croissant, Home, Ban, Trash2, BarChart3, Store } from 'lucide-react'
import { navFor } from '@/lib/portal/access'
import { PortalClock } from './portal-clock'
import { PortalBackButton } from './portal-back-button'
import { signOut } from '@/app/portal/entrar/actions'
import type { Locale, StaffRole } from '@/lib/data/types'

const ICONS = {
  today: Home,
  orders: ClipboardList,
  production: Croissant,
  eightySix: Ban,
  waste: Trash2,
  admin: BarChart3,
} as const

/**
 * The portal chrome.
 *
 * Left rail on tablet and desktop, bottom tabs on a phone. Targets are
 * 56px, not 48 — this is used at 5 AM with flour on your hands. Type
 * runs one step larger than the marketing site for the same reason.
 */
export async function PortalShell({
  role,
  locale,
  children,
}: {
  role: StaffRole
  locale: Locale
  children: React.ReactNode
}) {
  const t = await getTranslations({ locale, namespace: 'portal' })
  const items = navFor(role)

  return (
    <div className="portal">
      <nav className="portal-rail" aria-label={t('nav')}>
        <ul className="portal-rail__list">
          {items.map((item) => {
            const Icon = ICONS[item.key]
            return (
              <li key={item.href}>
                <Link href={item.href} className="portal-rail__link">
                  <Icon aria-hidden="true" />
                  <span>{t(`nav_${item.key}`)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="portal-main">
        <header className="portal-head">
          <div className="portal-head__start">
            <PortalBackButton label={t('back')} />
            <PortalClock locale={locale} />
          </div>
          <div className="portal-head__out">
            <Link href="/" className="btn btn--secondary portal-head__website">
              <Store size={18} aria-hidden="true" className="portal-head__website-icon" />
              <span className="portal-head__website-label">{t('backToWebsite')}</span>
            </Link>
            <form action={signOut} className="portal-head__signout-form">
              <p className="portal-head__role">{t(`role_${role}`)}</p>
              <button type="submit" className="portal-head__signout">
                {t('signOut')}
              </button>
            </form>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
