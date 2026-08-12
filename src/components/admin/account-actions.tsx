'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setAccountStatus } from '@/app/actions/wholesale'
import type { WholesaleStatus } from '@/lib/data/types'

export function AccountActions({
  id,
  status,
}: {
  id: string
  status: WholesaleStatus
}) {
  const t = useTranslations('wholesale')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function set(next: WholesaleStatus) {
    startTransition(async () => {
      await setAccountStatus(id, next)
      router.refresh()
    })
  }

  return (
    <div className="acct-actions">
      {status === 'pending' && (
        <button
          type="button"
          className="btn btn--primary"
          disabled={pending}
          onClick={() => set('approved')}
        >
          {t('approve')}
        </button>
      )}
      {status === 'approved' && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={() => set('suspended')}
        >
          {t('suspend')}
        </button>
      )}
      {status === 'suspended' && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={() => set('approved')}
        >
          {t('reinstate')}
        </button>
      )}
    </div>
  )
}
