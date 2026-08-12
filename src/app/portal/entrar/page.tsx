import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { IS_DEMO } from '@/lib/data'
import { staffLocale } from '@/lib/auth/role'
import { signInAs } from './actions'
import type { StaffRole } from '@/lib/data/types'

export const metadata = { robots: { index: false, follow: false } }

const CARDS: { role: StaffRole; titleKey: 'roleCounter' | 'roleBaker' | 'roleManager' | 'roleOwner'; descKey: 'roleCounterDesc' | 'roleBakerDesc' | 'roleManagerDesc' | 'roleOwnerDesc' }[] = [
  { role: 'counter', titleKey: 'roleCounter', descKey: 'roleCounterDesc' },
  { role: 'baker', titleKey: 'roleBaker', descKey: 'roleBakerDesc' },
  { role: 'manager', titleKey: 'roleManager', descKey: 'roleManagerDesc' },
  { role: 'owner', titleKey: 'roleOwner', descKey: 'roleOwnerDesc' },
]

/** Demo-only. In a non-demo build the role cards do not render at all. */
export default async function SignInPage() {
  if (!IS_DEMO) notFound()

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'demo' })

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('roleTitle')}</h1>
        <p className="page-head__intro">{t('roleIntro')}</p>
      </header>

      <ul className="role-cards">
        {CARDS.map((card) => (
          <li key={card.role}>
            <form action={signInAs}>
              <input type="hidden" name="role" value={card.role} />
              <button type="submit" className="role-card">
                <span className="role-card__title">{t(card.titleKey)}</span>
                <span className="role-card__desc">{t(card.descKey)}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
