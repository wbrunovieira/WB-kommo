'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getAccessToken } from '@/lib/auth'
import {
  getLeadFieldConfigs,
  createLeadFieldConfig,
  updateLeadFieldConfig,
  deleteLeadFieldConfig,
  reorderLeadFieldConfigs,
  LeadFieldConfig,
} from '@/lib/api'

const FIELD_TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'DATE', label: 'Data' },
  { value: 'SELECT', label: 'Seleção' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a45',
  borderRadius: '8px',
  color: '#e8e8f0',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#8888aa',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const [configs, setConfigs] = useState<LeadFieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editConfig, setEditConfig] = useState<LeadFieldConfig | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getLeadFieldConfigs(token)
      .then(data => { setConfigs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleToggle(config: LeadFieldConfig) {
    const token = getAccessToken()
    if (!token) return
    const updated = await updateLeadFieldConfig(config.id, { isActive: !config.isActive }, token).catch(() => null)
    if (updated) setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  async function handleDelete(id: string) {
    const token = getAccessToken()
    if (!token) return
    await deleteLeadFieldConfig(id, token).catch(() => null)
    setConfigs(prev => prev.filter(c => c.id !== id))
  }

  async function handleReorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = configs.findIndex(c => c.id === active.id)
    const newIndex = configs.findIndex(c => c.id === over.id)
    const reordered = arrayMove(configs, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))
    setConfigs(reordered)
    const token = getAccessToken()
    if (!token) return
    await reorderLeadFieldConfigs(reordered.map(c => ({ configId: c.id, order: c.order })), token).catch(() => null)
  }

  async function handleSaveNew(label: string, type: string, isRequired: boolean, options: string[]) {
    const token = getAccessToken()
    if (!token) return
    const created = await createLeadFieldConfig({ label, type, isRequired, options }, token).catch(() => null)
    if (created) {
      setConfigs(prev => [...prev, created])
      setShowAddModal(false)
    }
  }

  async function handleSaveEdit(id: string, updates: { label: string; isRequired: boolean; options: string[] }) {
    const token = getAccessToken()
    if (!token) return
    const updated = await updateLeadFieldConfig(id, updates, token).catch(() => null)
    if (updated) {
      setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c))
      setEditConfig(null)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return (
    <div style={{ maxWidth: '700px', color: '#e8e8f0' }}>
      {showAddModal && (
        <AddFieldModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveNew}
          t={t}
        />
      )}
      {editConfig && (
        <EditFieldModal
          config={editConfig}
          onClose={() => setEditConfig(null)}
          onSave={(updates) => handleSaveEdit(editConfig.id, updates)}
          t={t}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('title')}</h1>
        <p style={{ fontSize: '13px', color: '#8888aa', margin: '4px 0 0' }}>{t('subtitle')}</p>
      </div>

      {/* Lead Fields Section */}
      <div style={{
        backgroundColor: '#16213e',
        borderRadius: '16px',
        border: '1px solid #2a2a45',
        overflow: 'hidden',
      }}>
        {/* Section Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #2a2a45',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{t('leadFields.title')}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8888aa' }}>{t('leadFields.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#6c63ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('leadFields.addField')}
          </button>
        </div>

        {/* Fields list */}
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#8888aa' }}>...</div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleReorder}>
            <SortableContext items={configs.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div>
                {configs.map((config, idx) => (
                  <SortableFieldRow
                    key={config.id}
                    config={config}
                    isLast={idx === configs.length - 1}
                    onToggle={() => handleToggle(config)}
                    onEdit={() => setEditConfig(config)}
                    onDelete={() => handleDelete(config.id)}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

// ── Sortable Field Row ─────────────────────────────────────────────────────────

function SortableFieldRow({
  config,
  isLast,
  onToggle,
  onEdit,
  onDelete,
  t,
}: {
  config: LeadFieldConfig
  isLast: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  t: ReturnType<typeof useTranslations<'settings'>>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.id })

  const typeLabel = ({
    TEXT: t('leadFields.types.text'),
    NUMBER: t('leadFields.types.number'),
    EMAIL: t('leadFields.types.email'),
    PHONE: t('leadFields.types.phone'),
    DATE: t('leadFields.types.date'),
    SELECT: t('leadFields.types.select'),
  } as Record<string, string>)[config.type] ?? config.type

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        padding: '14px 24px',
        borderBottom: isLast ? 'none' : '1px solid #2a2a45',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: isDragging ? '#1a1a2e' : 'transparent',
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#4a4a65', flexShrink: 0, touchAction: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Label + type */}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: config.isActive ? '#e8e8f0' : '#8888aa' }}>
          {config.label}
        </span>
        {config.isRequired && (
          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ff6b6b' }}>*</span>
        )}
        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#8888aa' }}>{typeLabel}</span>
        {config.isBuiltin && (
          <span style={{
            marginLeft: '8px', fontSize: '11px', backgroundColor: 'rgba(108,99,255,0.15)',
            color: '#6c63ff', borderRadius: '4px', padding: '1px 6px',
          }}>
            {t('leadFields.builtin')}
          </span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        title={config.isActive ? t('leadFields.deactivate') : t('leadFields.activate')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: config.isActive ? '#6bffb8' : '#8888aa', padding: '4px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {config.isActive ? (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          )}
        </svg>
      </button>

      {/* Edit */}
      <button
        onClick={onEdit}
        title={t('leadFields.edit')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa', padding: '4px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Delete (only non-builtin) */}
      {!config.isBuiltin && (
        <button
          onClick={onDelete}
          title={t('leadFields.delete')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', padding: '4px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Add Field Modal ────────────────────────────────────────────────────────────

function AddFieldModal({
  onClose,
  onSave,
  t,
}: {
  onClose: () => void
  onSave: (label: string, type: string, isRequired: boolean, options: string[]) => void
  t: ReturnType<typeof useTranslations<'settings'>>
}) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('TEXT')
  const [isRequired, setIsRequired] = useState(false)
  const [optionsText, setOptionsText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    const options = type === 'SELECT' ? optionsText.split('\n').map(o => o.trim()).filter(Boolean) : []
    await onSave(label.trim(), type, isRequired, options)
    setSaving(false)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#16213e', border: '1px solid #2a2a45', borderRadius: '16px',
        width: '100%', maxWidth: '440px', padding: '28px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('leadFields.addField')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>{t('leadFields.fieldLabel')} *</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={labelStyle}>{t('leadFields.fieldType')}</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {FIELD_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {type === 'SELECT' && (
            <div>
              <label style={labelStyle}>{t('leadFields.selectOptions')}</label>
              <textarea
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                placeholder={t('leadFields.selectOptionsPlaceholder')}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#e8e8f0' }}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            {t('leadFields.required')}
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: '1px solid #2a2a45', borderRadius: '8px',
              color: '#8888aa', padding: '10px 20px', fontSize: '14px', cursor: 'pointer',
            }}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={!label.trim() || saving} style={{
              backgroundColor: label.trim() && !saving ? '#6c63ff' : '#2a2a45',
              color: label.trim() && !saving ? '#fff' : '#8888aa',
              border: 'none', borderRadius: '8px', padding: '10px 24px',
              fontSize: '14px', fontWeight: 600, cursor: label.trim() && !saving ? 'pointer' : 'not-allowed',
            }}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Field Modal ───────────────────────────────────────────────────────────

function EditFieldModal({
  config,
  onClose,
  onSave,
  t,
}: {
  config: LeadFieldConfig
  onClose: () => void
  onSave: (updates: { label: string; isRequired: boolean; options: string[] }) => void
  t: ReturnType<typeof useTranslations<'settings'>>
}) {
  const [label, setLabel] = useState(config.label)
  const [isRequired, setIsRequired] = useState(config.isRequired)
  const [optionsText, setOptionsText] = useState(config.options.join('\n'))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    const options = config.type === 'SELECT' ? optionsText.split('\n').map(o => o.trim()).filter(Boolean) : config.options
    await onSave({ label: label.trim(), isRequired, options })
    setSaving(false)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#16213e', border: '1px solid #2a2a45', borderRadius: '16px',
        width: '100%', maxWidth: '440px', padding: '28px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('leadFields.editField')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>{t('leadFields.fieldLabel')} *</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} autoFocus />
          </div>

          {config.type === 'SELECT' && (
            <div>
              <label style={labelStyle}>{t('leadFields.selectOptions')}</label>
              <textarea
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                placeholder={t('leadFields.selectOptionsPlaceholder')}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#e8e8f0' }}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            {t('leadFields.required')}
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: '1px solid #2a2a45', borderRadius: '8px',
              color: '#8888aa', padding: '10px 20px', fontSize: '14px', cursor: 'pointer',
            }}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={!label.trim() || saving} style={{
              backgroundColor: label.trim() && !saving ? '#6c63ff' : '#2a2a45',
              color: label.trim() && !saving ? '#fff' : '#8888aa',
              border: 'none', borderRadius: '8px', padding: '10px 24px',
              fontSize: '14px', fontWeight: 600, cursor: label.trim() && !saving ? 'pointer' : 'not-allowed',
            }}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
