'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getUser, getAccessToken, StoredUser } from '@/lib/auth'
import { getWorkspaceUsers, createWorkspaceUser, WorkspaceUser } from '@/lib/api'

const ROLE_OPTIONS = ['ACCOUNT_ADMIN', 'MEMBER', 'AGENT'] as const
type CreateableRole = typeof ROLE_OPTIONS[number]

interface CreateUserForm {
  name: string
  email: string
  password: string
  role: CreateableRole
  timezone: string
  language: string
}

const emptyForm = (): CreateUserForm => ({
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
})

export default function UsersPage() {
  const t = useTranslations('users')
  const [user, setUser] = useState<StoredUser | null>(null)
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateUserForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u) return

    const token = getAccessToken()
    if (!token) return

    getWorkspaceUsers(token)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setError(null)
    try {
      const created = await createWorkspaceUser(
        {
          tenantId: user.tenantId,
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          timezone: form.timezone || undefined,
          language: form.language || undefined,
        },
        token,
      )
      // Refresh list
      const updated = await getWorkspaceUsers(token)
      setUsers(updated)
      setShowModal(false)
      setForm(emptyForm())
    } catch (err: any) {
      setError(err?.detail ?? t('createError'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const canCreate = user.role !== 'AGENT'

  return (
    <div style={{ color: '#e8e8f0', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#e8e8f0' }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: 0 }}>
            {t('subtitle')}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#6c63ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addUser')}
          </button>
        )}
      </div>

      {/* Users table */}
      <div style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888aa', fontSize: '14px' }}>
            {t('loading')}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888aa', fontSize: '14px' }}>
            {t('empty')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a45' }}>
                {[t('colName'), t('colEmail'), t('colRole'), t('colVerified'), t('colJoined')].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8888aa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.identityId}
                  style={{ borderBottom: idx < users.length - 1 ? '1px solid #1e1e35' : 'none' }}
                >
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#e8e8f0' }}>
                    {u.name}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8888aa' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: u.isEmailVerified ? '#4caf82' : '#8888aa' }}>
                    {u.isEmailVerified ? '✓' : '–'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8888aa' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create user modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#16213e', borderRadius: '16px', border: '1px solid #2a2a45',
            padding: '28px', width: '440px', maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>
                {t('addUser')}
              </h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm()); setError(null) }}
                style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                fontSize: '13px', color: '#f87171',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField label={t('fieldName')}>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>

              <FormField label={t('fieldEmail')}>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>

              <FormField label={t('fieldPassword')}>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={t('passwordHint')}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>

              <FormField label={t('fieldRole')}>
                <select
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value as CreateableRole }))}
                  style={inputStyle}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{t(`role_${r}` as any)}</option>
                  ))}
                </select>
              </FormField>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm()); setError(null) }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid #2a2a45', background: 'none',
                    color: '#8888aa', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: 'none', backgroundColor: saving ? '#4a4370' : '#6c63ff',
                    color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a45',
  borderRadius: '8px',
  color: '#e8e8f0',
  fontSize: '14px',
  boxSizing: 'border-box',
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8888aa', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_OWNER: '#a78bfa',
  RESELLER: '#60a5fa',
  ACCOUNT_ADMIN: '#34d399',
  MEMBER: '#6c63ff',
  AGENT: '#f59e0b',
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#8888aa'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: `${color}22`,
      color,
      border: `1px solid ${color}44`,
    }}>
      {role}
    </span>
  )
}
