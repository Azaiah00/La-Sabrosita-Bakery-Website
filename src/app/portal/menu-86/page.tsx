import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale } from '@/lib/auth/role'
import { can } from '@/lib/portal/access'
import { db } from '@/lib/data'
import { EightySixBoard } from '@/components/portal/eighty-six-board'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function EightySixPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!can(role, 'eightySix')) redirect('/portal')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'portal' })

  // Straight from the adapter, not through the public menu helper —
  // that one filters 86'd items out, which is precisely what this screen
  // needs to show.
  const categories = await db.getMenu(locale)

  return (
    <main id="contenido" className="portal-page">
      <header className="page-head">
        <h1 className="page-head__title">{t('title86')}</h1>
        <p className="page-head__intro">{t('lede86')}</p>
      </header>

      <EightySixBoard categories={categories} />
    </main>
  )
}
