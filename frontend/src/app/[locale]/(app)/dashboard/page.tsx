'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getUser, StoredUser } from '@/lib/auth'
import { CreateClientSection } from '@/components/create-client-section'
import { TenantListSection } from '@/components/tenant-list-section'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  if (!user) return null

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0], { default: user.role })

  return (
    <div style={{ maxWidth: '860px', color: '#e8e8f0' }}>
      {/* Welcome card */}
      <div style={{
        backgroundColor: '#16213e',
        borderRadius: '16px',
        border: '1px solid #2a2a45',
        padding: '32px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}>
        <div style={{
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
        }}>
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

      {/* Tenant list + impersonation — visible to RESELLER and PLATFORM_OWNER */}
      {(user.role === 'RESELLER' || user.role === 'PLATFORM_OWNER') && (
        <TenantListSection currentTenantId={user.tenantId} />
      )}

      {/* Create client section — visible to RESELLER and PLATFORM_OWNER */}
      {(user.role === 'RESELLER' || user.role === 'PLATFORM_OWNER') && (
        <CreateClientSection role={user.role} tenantId={user.tenantId} />
      )}

      {/* Coming soon placeholder */}
      <div style={{
        marginTop: '40px',
        padding: '40px',
        backgroundColor: '#16213e',
        borderRadius: '16px',
        border: '1px dashed #2a2a45',
        textAlign: 'center',
        color: '#8888aa',
      }}>
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
    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      backgroundColor: '#16213e',
      borderRadius: '12px',
      border: '1px solid #2a2a45',
      padding: '20px 24px',
    }}>
      <p style={{
        fontSize: '11px',
        fontWeight: 600,
        color: '#8888aa',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 8px',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '14px',
        fontWeight: 600,
        color: accent ? '#6c63ff' : '#e8e8f0',
        margin: 0,
        wordBreak: 'break-all',
      }}>
        {value}
      </p>
    </div>
  )
}
