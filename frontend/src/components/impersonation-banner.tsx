'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { exitImpersonation, getImpersonatedInfo } from '@/lib/auth'

export function ImpersonationBanner() {
  const t = useTranslations('dashboard.impersonation')
  const router = useRouter()
  const info = getImpersonatedInfo()

  function handleExit() {
    exitImpersonation()
    router.replace('/dashboard')
  }

  return (
    <div style={bannerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span style={{ fontSize: '13px' }}>
          {t('banner')}{' '}
          <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
            {info?.name ?? info?.slug ?? '—'}
          </strong>
          {info?.slug && (
            <span style={{ color: 'rgba(255,200,80,0.7)', marginLeft: '6px', fontSize: '12px' }}>
              ({info.slug})
            </span>
          )}
        </span>
      </div>

      <button onClick={handleExit} style={exitButtonStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {t('exit')}
      </button>
    </div>
  )
}

const bannerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 180, 50, 0.1)',
  border: '1px solid rgba(255, 180, 50, 0.3)',
  borderRadius: 0,
  color: 'rgb(255, 200, 80)',
  padding: '10px 32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  fontSize: '13px',
}

const exitButtonStyle: React.CSSProperties = {
  background: 'rgba(255, 180, 50, 0.15)',
  border: '1px solid rgba(255, 180, 50, 0.4)',
  borderRadius: '6px',
  color: 'rgb(255, 200, 80)',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexShrink: 0,
}
