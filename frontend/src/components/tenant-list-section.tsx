'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { getTenants, impersonate, TenantListItem, ApiError } from '@/lib/api'
import { getAccessToken, startImpersonation } from '@/lib/auth'

interface Props {
  currentTenantId: string
}

export function TenantListSection({ currentTenantId }: Props) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [tenants, setTenants]     = useState<TenantListItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [entering, setEntering]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getTenants(token)
      .then(setTenants)
      .catch(() => setError(null))    // silent — section simply stays hidden on error
      .finally(() => setLoading(false))
  }, [])

  async function handleEnter(tenant: TenantListItem) {
    const token = getAccessToken()
    if (!token) return
    setEntering(tenant.id)
    setError(null)
    try {
      const tokens = await impersonate(tenant.id, token)
      startImpersonation(tokens, { name: tenant.name, slug: tenant.slug })
      router.replace('/dashboard')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr?.detail ?? 'Erro ao entrar na empresa.')
      setEntering(null)
    }
  }

  if (loading) {
    return (
      <section style={sectionStyle}>
        <SectionHeader t={t} />
        <p style={{ color: '#555577', fontSize: '14px' }}>{t('tenantList.loading')}</p>
      </section>
    )
  }

  if (tenants.length === 0) {
    return (
      <section style={sectionStyle}>
        <SectionHeader t={t} />
        <div style={emptyStyle}>
          <BuildingIcon />
          <p style={{ margin: 0, fontSize: '14px', color: '#555577' }}>{t('tenantList.empty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <SectionHeader t={t} />

      {error && (
        <div role="alert" style={errorStyle}>{error}</div>
      )}

      <div style={gridStyle}>
        {tenants.map((tenant) => {
          const isCurrent = tenant.id === currentTenantId
          const isEntering = entering === tenant.id

          return (
            <div
              key={tenant.id}
              style={{
                ...cardStyle,
                borderColor: isCurrent ? '#6c63ff' : '#2a2a45',
                opacity: entering && !isEntering ? 0.5 : 1,
              }}
            >
              {/* Avatar */}
              <div style={avatarStyle}>
                {tenant.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={tenantNameStyle}>{tenant.name}</p>
                <p style={tenantSlugStyle}>{tenant.slug}</p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={tenant.isActive ? activeBadgeStyle : inactiveBadgeStyle}>
                    {tenant.isActive ? t('tenantList.active') : t('tenantList.inactive')}
                  </span>
                  <span style={typeBadgeStyle}>
                    {tenant.resellerTenantId ? t('tenantList.client') : t('tenantList.reseller')}
                  </span>
                </div>
              </div>

              {/* Action */}
              {isCurrent ? (
                <span style={currentBadgeStyle}>✓</span>
              ) : (
                <button
                  onClick={() => handleEnter(tenant)}
                  disabled={!!entering}
                  style={{
                    ...enterButtonStyle,
                    opacity: !!entering ? 0.5 : 1,
                    cursor: !!entering ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isEntering ? <MiniSpinner /> : t('tenantList.enter')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'dashboard'>> }) {
  return (
    <div style={headerStyle}>
      <div style={iconWrapStyle}>
        <BuildingIcon color="#6c63ff" />
      </div>
      <div>
        <h3 style={titleStyle}>{t('tenantList.sectionTitle')}</h3>
        <p style={descStyle}>{t('tenantList.sectionDesc')}</p>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BuildingIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function MiniSpinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginTop: '40px',
  backgroundColor: '#16213e',
  borderRadius: '16px',
  border: '1px solid #2a2a45',
  padding: '32px',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '24px',
}

const iconWrapStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  backgroundColor: 'rgba(108, 99, 255, 0.12)',
  border: '1px solid rgba(108, 99, 255, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#e8e8f0',
  margin: '0 0 4px',
}

const descStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8888aa',
  margin: 0,
}

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '32px',
  color: '#555577',
}

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px 20px',
  backgroundColor: '#0f0f1a',
  borderRadius: '12px',
  border: '1px solid #2a2a45',
  transition: 'border-color 0.15s',
}

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a45',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: 700,
  color: '#6c63ff',
  flexShrink: 0,
}

const tenantNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#e8e8f0',
  margin: '0 0 2px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const tenantSlugStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555577',
  margin: 0,
  fontFamily: 'monospace',
}

const activeBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: '#6bffb8',
  backgroundColor: 'rgba(107, 255, 184, 0.1)',
  border: '1px solid rgba(107, 255, 184, 0.2)',
  borderRadius: '4px',
  padding: '2px 6px',
}

const inactiveBadgeStyle: React.CSSProperties = {
  ...activeBadgeStyle,
  color: '#ff8f8f',
  backgroundColor: 'rgba(255, 143, 143, 0.1)',
  border: '1px solid rgba(255, 143, 143, 0.2)',
}

const typeBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: '#8888aa',
  backgroundColor: 'rgba(136, 136, 170, 0.08)',
  border: '1px solid rgba(136, 136, 170, 0.15)',
  borderRadius: '4px',
  padding: '2px 6px',
}

const enterButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#6c63ff',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const currentBadgeStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'rgba(108, 99, 255, 0.15)',
  color: '#6c63ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 700,
  flexShrink: 0,
}

const errorStyle: React.CSSProperties = {
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: 'rgba(255, 107, 107, 0.1)',
  border: '1px solid rgba(255, 107, 107, 0.3)',
  color: '#ff8f8f',
  fontSize: '14px',
}
