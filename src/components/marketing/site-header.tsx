'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LogoDraw } from '@/components/motion/logo-draw'
import { LanguageToggle } from './language-toggle'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import type { Locale } from '@/lib/data/types'

const NAV = [
  { href: '/menu', key: 'menu' },
  { href: '/pasteles', key: 'cakes' },
  { href: '/mayoreo', key: 'wholesale' },
  { href: '/nuestra-historia', key: 'story' },
  { href: '/visitanos', key: 'visit' },
] as const

/**
 * Transparent over the dark hero, solid --surface with a --line bottom
 * border once scrolled past 80px. The scroll listener is passive and
 * writes a boolean, nothing more — no layout is read on scroll.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations('nav')
  const a11y = useTranslations('a11y')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="site-header" data-scrolled={scrolled || undefined}>
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label={a11y('logoHome')}>
          <LogoDraw size={40} animate />
          <span className="site-header__wordmark">La Sabrosita</span>
        </Link>

        <nav className="site-header__nav" aria-label={a11y('primaryNav')}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="site-header__link">
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <LanguageToggle current={locale} />
          <Link href="/pasteles/pedir" className="btn btn--primary site-header__cta">
            {t('orderCake')}
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="site-header__burger" aria-label={a11y('openMenu')}>
                <Menu aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="site-nav-sheet">
              <SheetHeader>
                <SheetTitle>{a11y('primaryNav')}</SheetTitle>
              </SheetHeader>
              <nav className="site-nav-sheet__nav" aria-label={a11y('primaryNav')}>
                {NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link href={item.href} className="site-nav-sheet__link">
                      {t(item.key)}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link href="/pasteles/pedir" className="btn btn--primary site-nav-sheet__cta">
                    {t('orderCake')}
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
