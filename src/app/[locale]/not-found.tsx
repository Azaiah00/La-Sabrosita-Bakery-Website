import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  const t = useTranslations('errors')
  const nav = useTranslations('nav')

  return (
    <main id="contenido" className="shell">
      <header className="page-head">
        <h1 className="page-head__title">{t('notFoundTitle')}</h1>
        <p className="page-head__intro">{t('notFoundBody')}</p>
      </header>
      <p className="home-actions">
        <Link href="/" className="btn btn--primary">
          {t('backHome')}
        </Link>
        <Link href="/menu" className="btn btn--secondary">
          {nav('menu')}
        </Link>
      </p>
    </main>
  )
}
