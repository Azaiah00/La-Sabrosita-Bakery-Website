import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import type { Messages } from '@/i18n/messages'

type StaffKey = keyof Messages['staff']

/**
 * A staff route that exists and is gated, but whose screen is built in a
 * later prompt. The gate is real from day one — an unauthenticated visit
 * lands on the role cards, not on an empty page.
 */
export function staffPendingPage(key: StaffKey) {
  return async function Page() {
    const role = await currentRole()
    if (!role) redirect('/portal/entrar')

    const locale = await staffLocale()
    const t = await getTranslations({ locale, namespace: 'staff' })

    return (
      <main id="contenido" className="shell">
        <header className="page-head">
          <h1 className="page-head__title">{t(key)}</h1>
          <p className="page-head__intro">{t('pending')}</p>
        </header>
      </main>
    )
  }
}
