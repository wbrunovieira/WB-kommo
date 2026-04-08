'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createTenant, registerUser, ApiError } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'

interface Props {
  role: string
  tenantId: string
}

type Phase = 'form' | 'success'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateClientSection({ role }: Props) {
  const t = useTranslations('dashboard.createClient')

  const [phase, setPhase] = useState<Phase>('form')
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')

  function handleCompanyNameChange(value: string) {
    setCompanyName(value)
    if (!slugManual) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const accessToken = getAccessToken()
    if (!accessToken) {
      setError(t('errors.401'))
      setLoading(false)
      return
    }

    try {
      // Step 1: create the tenant
      const tenant = await createTenant(
        {
          name: companyName,
          slug,
          // PLATFORM_OWNER: resellerTenantId is omitted → null (creates reseller)
          // RESELLER: backend sets it automatically from JWT
        },
        accessToken,
      )

      // Step 2: create the admin user in that tenant
      await registerUser(
        {
          tenantId: tenant.id,
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: role === 'PLATFORM_OWNER' ? 'ACCOUNT_ADMIN' : 'ACCOUNT_ADMIN',
        },
        accessToken,
      )

      setCreatedName(companyName)
      setCreatedSlug(slug)
      setPhase('success')
    } catch (err) {
      const apiErr = err as ApiError
      const errorKeys = { '401': true, '403': true, '409': true, '422': true }
      const key = String(apiErr?.status) as keyof typeof errorKeys
      setError(
        key in errorKeys
          ? t(`errors.${key}` as Parameters<typeof t>[0])
          : (apiErr?.detail ?? t('errors.unknown')),
      )
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setPhase('form')
    setCompanyName('')
    setSlug('')
    setSlugManual(false)
    setAdminName('')
    setAdminEmail('')
    setAdminPassword('')
    setError(null)
  }

  if (phase === 'success') {
    return (
      <section style={sectionStyle}>
        <div style={successCardStyle}>
          <div style={successIconWrapStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6bffb8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8f0', margin: '0 0 8px' }}>
            {t('successTitle')}
          </h3>
          <p style={{ fontSize: '14px', color: '#8888aa', margin: '0 0 24px', lineHeight: 1.6 }}>
            {t('successDesc', { name: createdName, slug: createdSlug })}
          </p>
          <div style={slugBadgeStyle}>
            <span style={{ fontSize: '12px', color: '#8888aa' }}>slug:</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#6c63ff', fontFamily: 'monospace' }}>{createdSlug}</span>
          </div>
          <button onClick={handleReset} style={secondaryButtonStyle}>
            {t('createAnother')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <div style={sectionIconStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <h3 style={sectionTitleStyle}>{t('sectionTitle')}</h3>
          <p style={sectionDescStyle}>{t('sectionDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Row: Company name + Slug */}
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('companyName')}</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              placeholder={t('companyNamePlaceholder')}
              required
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('slug')}</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t('slugPlaceholder')}
              required
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
            <span style={hintStyle}>{t('slugHint')}</span>
          </div>
        </div>

        {/* Row: Admin name + email */}
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('adminName')}</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder={t('adminNamePlaceholder')}
              required
              autoComplete="name"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('adminEmail')}</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={t('adminEmailPlaceholder')}
              required
              autoComplete="email"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>{t('adminPassword')}</label>
          <div style={{ position: 'relative', marginTop: '8px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={t('adminPasswordPlaceholder')}
              required
              autoComplete="new-password"
              style={{ ...inputStyle, marginTop: 0, paddingRight: '48px' }}
              onFocus={(e) => Object.assign(e.target.style, { ...inputFocusStyle, paddingRight: '48px' })}
              onBlur={(e) => Object.assign(e.target.style, { ...inputStyle, paddingRight: '48px', marginTop: 0 })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={eyeButtonStyle}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" style={errorStyle}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ ...submitButtonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Spinner /> {t('submitting')}
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>
    </section>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginTop: '40px',
  backgroundColor: '#16213e',
  borderRadius: '16px',
  border: '1px solid #2a2a45',
  padding: '32px',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '28px',
}

const sectionIconStyle: React.CSSProperties = {
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#e8e8f0',
  margin: '0 0 4px',
}

const sectionDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8888aa',
  margin: 0,
}

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '16px',
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#8888aa',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: '#0f0f1a',
  border: '1px solid #2a2a45',
  borderRadius: '8px',
  color: '#e8e8f0',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
}

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#6c63ff',
}

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#555577',
  marginTop: '6px',
}

const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8888aa',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
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

const submitButtonStyle: React.CSSProperties = {
  padding: '12px 28px',
  backgroundColor: '#6c63ff',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  ...submitButtonStyle,
  backgroundColor: 'transparent',
  border: '1px solid #6c63ff',
  color: '#6c63ff',
  marginTop: '16px',
}

const successCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '16px',
}

const successIconWrapStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: 'rgba(107, 255, 184, 0.1)',
  border: '2px solid rgba(107, 255, 184, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
}

const slugBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#0f0f1a',
  border: '1px solid #2a2a45',
  borderRadius: '8px',
  padding: '8px 16px',
  marginBottom: '24px',
}
