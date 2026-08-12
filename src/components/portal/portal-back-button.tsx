'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function PortalBackButton({ label }: { label: string }) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Don't show back button on the main portal pages (the ones in the nav rail)
  const isMainPage = pathname === '/portal' || 
                     pathname.match(/^\/portal\/(pedidos|produccion|menu-86|merma)$/) ||
                     pathname === '/admin'
                     
  if (isMainPage) return null

  return (
    <button 
      onClick={() => router.back()} 
      className="btn btn--ghost"
      style={{ padding: 'var(--space-2) var(--space-3)', height: 'auto', minHeight: '44px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      <ChevronLeft size={20} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}