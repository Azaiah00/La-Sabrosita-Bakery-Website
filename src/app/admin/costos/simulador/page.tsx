import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { currentRole, staffLocale, canSeeAdmin } from '@/lib/auth/role'
import { db } from '@/lib/data'
import { PriceSimulator } from '@/components/admin/price-simulator'

export const metadata = { robots: { index: false, follow: false } }

export default async function SimulatorPage() {
  const role = await currentRole()
  if (!role) redirect('/portal/entrar')
  if (!canSeeAdmin(role)) redirect('/portal/pedidos')

  const locale = await staffLocale()
  const t = await getTranslations({ locale, namespace: 'costs' })
  const ingredients = await db.getIngredients()

  return (
    <main id="contenido" className="shell admin">
      <header className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('simulatorTitle')}</h1>
        <p className="page-head__intro">{t('simulatorLede')}</p>
      </header>

      <PriceSimulator ingredients={ingredients} locale={locale} />

      <p className="admin-more">
        <Link href="/admin/costos" className="btn btn--secondary">
          {t('backToCosts')}
        </Link>
      </p>
    </main>
  )
}
