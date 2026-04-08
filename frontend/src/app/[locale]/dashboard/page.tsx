'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { getUser, clearSession, StoredUser } from '@/lib/auth'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CreateClientSection } from '@/components/create-client-section'
import { TenantListSection } from '@/components/tenant-list-section'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { isImpersonating } from '@/lib/auth'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    const stored = getUser()
    if (!stored) {
      router.replace('/login')
      return
    }
    setUser(stored)
  }, [router])

  function handleLogout() {
    clearSession()
    router.replace('/login')
  }

  if (!user) return null

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0], { default: user.role })

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f1a',
        color: '#e8e8f0',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          backgroundColor: '#16213e',
          borderBottom: '1px solid #2a2a45',
          padding: '0 32px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#6c63ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>WB Kommo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitcher />

          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #2a2a45',
              borderRadius: '8px',
              color: '#8888aa',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '48px 32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Welcome card */}
        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '16px',
            border: '1px solid #2a2a45',
            padding: '32px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#1a1a2e',
              border: '2px solid #6c63ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 700,
              color: '#6c63ff',
              flexShrink: 0,
            }}
          >
            {user.role[0]}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px', color: '#e8e8f0' }}>
              {t('welcome')}
            </h2>
            <p style={{ fontSize: '14px', color: '#8888aa', margin: 0 }}>
              {t('loggedAs')}{' '}
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>
                {roleLabel}
              </span>
            </p>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <InfoCard label={t('userId')} value={user.userId} />
          <InfoCard label={t('tenantId')} value={user.tenantId} />
          <InfoCard label={t('role')} value={roleLabel} accent />
        </div>

        {/* Create client section — visible to RESELLER and PLATFORM_OWNER */}
        {(user.role === 'RESELLER' || user.role === 'PLATFORM_OWNER') && (
          <CreateClientSection role={user.role} tenantId={user.tenantId} />
        )}

        {/* Coming soon placeholder */}
        <div
          style={{
            marginTop: '40px',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            border: '1px dashed #2a2a45',
            textAlign: 'center',
            color: '#8888aa',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {t('comingSoon')}
          </p>
        </div>
      </main>
    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: '#16213e',
        borderRadius: '12px',
        border: '1px solid #2a2a45',
        padding: '20px 24px',
      }}
    >
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
        {label}
      </p>
      <p
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: accent ? '#6c63ff' : '#e8e8f0',
          margin: 0,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </p>
    </div>
  )
}
