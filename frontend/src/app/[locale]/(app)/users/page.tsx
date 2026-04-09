'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getUser, getAccessToken, StoredUser } from '@/lib/auth'
import {
  getWorkspaceUsers,
  createWorkspaceUser,
  updateWorkspaceUser,
  softDeleteWorkspaceUser,
  WorkspaceUser,
} from '@/lib/api'

const ROLE_OPTIONS = ['ACCOUNT_ADMIN', 'MEMBER', 'AGENT'] as const
type CreateableRole = typeof ROLE_OPTIONS[number]

interface CreateUserForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: CreateableRole
  timezone: string
  language: string
}

interface EditUserForm {
  name: string
  timezone: string
  language: string
  role: CreateableRole
}

const emptyCreateForm = (): CreateUserForm => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'MEMBER',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
})

export default function UsersPage() {
  const t = useTranslations('users')
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [loading, setLoading] = useState(true)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm())
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<WorkspaceUser | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({ name: '', timezone: '', language: '', role: 'MEMBER' })

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceUser | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const u = getUser()
    setCurrentUser(u)
    if (!u) return
    const token = getAccessToken()
    if (!token) return
    getWorkspaceUsers(token)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function refreshList() {
    const token = getAccessToken()
    if (!token) return
    const updated = await getWorkspaceUsers(token)
    setUsers(updated)
  }

  function openEdit(u: WorkspaceUser) {
    setEditTarget(u)
    setEditForm({
      name: u.name,
      timezone: u.timezone,
      language: u.language,
      role: u.role as CreateableRole,
    })
    setError(null)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateForm(emptyCreateForm())
    setError(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  function closeEdit() {
    setEditTarget(null)
    setError(null)
  }

  function closeDelete() {
    setDeleteTarget(null)
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    const token = getAccessToken()
    if (!token) return
    if (createForm.password !== createForm.confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createWorkspaceUser(
        {
          tenantId: currentUser.tenantId,
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          timezone: createForm.timezone || undefined,
          language: createForm.language || undefined,
        },
        token,
      )
      await refreshList()
      closeCreate()
    } catch (err: any) {
      setError(err?.detail ?? t('createError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await updateWorkspaceUser(
        editTarget.identityId,
        {
          name: editForm.name,
          timezone: editForm.timezone,
          language: editForm.language,
          role: editForm.role,
        },
        token,
      )
      await refreshList()
      closeEdit()
    } catch (err: any) {
      setError(err?.detail ?? t('updateError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await softDeleteWorkspaceUser(deleteTarget.identityId, token)
      await refreshList()
      closeDelete()
    } catch (err: any) {
      setError(err?.detail ?? t('deleteError'))
    } finally {
      setSaving(false)
    }
  }

  if (!currentUser) return null

  const canManage = currentUser.role !== 'AGENT'
  const passwordsMatch =
    createForm.confirmPassword === '' || createForm.password === createForm.confirmPassword

  return (
    <div style={{ color: '#e8e8f0', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#e8e8f0' }}>{t('title')}</h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: 0 }}>{t('subtitle')}</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} style={primaryBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addUser')}
          </button>
        )}
      </div>

      {/* Users table */}
      <div style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888aa', fontSize: '14px' }}>{t('loading')}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888aa', fontSize: '14px' }}>{t('empty')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a45' }}>
                {[t('colName'), t('colEmail'), t('colRole'), t('colVerified'), t('colJoined'), ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '11px',
                    fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isSelf = u.identityId === currentUser.userId
                return (
                  <tr key={u.identityId} style={{ borderBottom: idx < users.length - 1 ? '1px solid #1e1e35' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#e8e8f0' }}>{u.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8888aa' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: u.isEmailVerified ? '#4caf82' : '#8888aa' }}>
                      {u.isEmailVerified ? '✓' : '–'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8888aa' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {canManage && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <IconButton title={t('edit')} onClick={() => openEdit(u)}>
                            <EditIcon />
                          </IconButton>
                          {!isSelf && (
                            <IconButton title={t('delete')} onClick={() => { setDeleteTarget(u); setError(null) }} danger>
                              <TrashIcon />
                            </IconButton>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title={t('addUser')} onClose={closeCreate}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label={t('fieldName')}>
              <input type="text" required minLength={2} value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label={t('fieldEmail')}>
              <input type="email" required value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label={t('fieldPassword')}>
              <PasswordInput value={createForm.password} onChange={(v) => setCreateForm(f => ({ ...f, password: v }))}
                show={showPassword} onToggle={() => setShowPassword(s => !s)}
                placeholder={t('passwordHint')} required minLength={8} />
            </FormField>
            <FormField label={t('fieldConfirmPassword')}>
              <PasswordInput value={createForm.confirmPassword} onChange={(v) => setCreateForm(f => ({ ...f, confirmPassword: v }))}
                show={showConfirmPassword} onToggle={() => setShowConfirmPassword(s => !s)}
                placeholder={t('fieldConfirmPassword')} required invalid={!passwordsMatch} />
              {!passwordsMatch && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f87171' }}>{t('passwordMismatch')}</p>
              )}
            </FormField>
            <FormField label={t('fieldRole')}>
              <select value={createForm.role} onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value as CreateableRole }))} style={inputStyle}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{t(`role_${r}` as any)}</option>)}
              </select>
            </FormField>
            <ModalActions saving={saving} disabled={!passwordsMatch} onCancel={closeCreate} saveLabel={t('save')} savingLabel={t('saving')} cancelLabel={t('cancel')} />
          </form>
        </Modal>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title={t('editUser')} onClose={closeEdit}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label={t('fieldName')}>
              <input type="text" required minLength={2} value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label={t('fieldTimezone')}>
              <input type="text" value={editForm.timezone}
                onChange={(e) => setEditForm(f => ({ ...f, timezone: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label={t('fieldLanguage')}>
              <input type="text" value={editForm.language}
                onChange={(e) => setEditForm(f => ({ ...f, language: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label={t('fieldRole')}>
              <select value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value as CreateableRole }))} style={inputStyle}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{t(`role_${r}` as any)}</option>)}
              </select>
            </FormField>
            <ModalActions saving={saving} onCancel={closeEdit} saveLabel={t('saveChanges')} savingLabel={t('saving')} cancelLabel={t('cancel')} />
          </form>
        </Modal>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title={t('deleteUser')} onClose={closeDelete} width={400}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <p style={{ fontSize: '14px', color: '#c0c0d8', margin: '0 0 20px', lineHeight: 1.6 }}>
            {t('deleteConfirm', { name: deleteTarget.name })}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={closeDelete} style={ghostBtnStyle}>{t('cancel')}</button>
            <button type="button" onClick={handleDelete} disabled={saving} style={{
              ...ghostBtnStyle, flex: 1, backgroundColor: saving ? '#5c2626' : '#ef444422',
              borderColor: '#ef4444aa', color: '#f87171',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? t('deleting') : t('deleteConfirmBtn')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, width = 440 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#16213e', borderRadius: '16px', border: '1px solid #2a2a45', padding: '28px', width: `${width}px`, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
      {children}
    </div>
  )
}

function ModalActions({ saving, disabled, onCancel, saveLabel, savingLabel, cancelLabel }: {
  saving: boolean; disabled?: boolean; onCancel: () => void; saveLabel: string; savingLabel: string; cancelLabel: string
}) {
  const isDisabled = saving || disabled
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
      <button type="button" onClick={onCancel} style={ghostBtnStyle}>{cancelLabel}</button>
      <button type="submit" disabled={isDisabled} style={{
        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
        backgroundColor: isDisabled ? '#4a4370' : '#6c63ff',
        color: '#fff', fontSize: '14px', fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}>
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  )
}

interface PasswordInputProps {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
  placeholder?: string; required?: boolean; minLength?: number; invalid?: boolean
}
function PasswordInput({ value, onChange, show, onToggle, placeholder, required, minLength, invalid }: PasswordInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} required={required} minLength={minLength}
        placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: '42px', borderColor: invalid ? '#f87171' : '#2a2a45' }} />
      <button type="button" onClick={onToggle} tabIndex={-1} style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#8888aa', display: 'flex', alignItems: 'center',
      }}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8888aa', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function IconButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'none', border: '1px solid', borderRadius: '6px', cursor: 'pointer',
      padding: '5px 7px', display: 'flex', alignItems: 'center',
      color: danger ? '#f87171' : '#8888aa', borderColor: danger ? '#f8717140' : '#2a2a45',
    }}>
      {children}
    </button>
  )
}

// ── icons ──────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}
function EyeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}

// ── styles ─────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a45', borderRadius: '8px', color: '#e8e8f0',
  fontSize: '14px', boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#6c63ff', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '6px',
}

const ghostBtnStyle: React.CSSProperties = {
  flex: 1, padding: '10px', borderRadius: '8px',
  border: '1px solid #2a2a45', background: 'none',
  color: '#8888aa', fontSize: '14px', cursor: 'pointer',
}

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_OWNER: '#a78bfa', RESELLER: '#60a5fa', ACCOUNT_ADMIN: '#34d399', MEMBER: '#6c63ff', AGENT: '#f59e0b',
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#8888aa'
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600, backgroundColor: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {role}
    </span>
  )
}
