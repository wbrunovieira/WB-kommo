'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { getUser, getAccessToken } from '@/lib/auth'
import {
  getLeads, getPipelines, getStages, getLead,
  updateLead, softDeleteLead,
  getLeadFieldConfigs,
  Lead, LeadFieldConfig, Pipeline, Stage,
  UpdateLeadPayload,
} from '@/lib/api'
import { CreateLeadModal } from '@/components/create-lead-modal'

type View = 'kanban' | 'list'

const STATUS_OPTIONS = ['OPEN', 'WON', 'LOST'] as const
type LeadStatus = typeof STATUS_OPTIONS[number]

const statusColors: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: 'rgba(108, 99, 255, 0.15)', color: '#6c63ff' },
  WON:  { bg: 'rgba(107, 255, 184, 0.15)', color: '#6bffb8' },
  LOST: { bg: 'rgba(255, 107, 107, 0.15)', color: '#ff6b6b' },
}

const selectStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a45',
  borderRadius: '8px',
  color: '#e8e8f0',
  padding: '8px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
}

// ── Edit form ──────────────────────────────────────────────────────────────────

interface EditLeadForm {
  name: string
  stageId: string
  pipelineId: string
  status: LeadStatus
  value: string
  tags: string
  customFields: Record<string, string>
}

function leadToForm(lead: Lead): EditLeadForm {
  return {
    name: lead.name,
    stageId: lead.stageId,
    pipelineId: lead.pipelineId,
    status: lead.status as LeadStatus,
    value: lead.value != null ? String(lead.value) : '',
    tags: lead.tags?.join(', ') ?? '',
    customFields: Object.fromEntries(
      Object.entries(lead.customFields ?? {}).map(([k, v]) => [k, String(v)])
    ),
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const t = useTranslations('leads')
  const [view, setView] = useState<View>('kanban')
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [allStages, setAllStages] = useState<Stage[]>([]) // stages for all loaded pipelines
  const [fieldConfigs, setFieldConfigs] = useState<LeadFieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStages, setLoadingStages] = useState(false)
  const [error, setError] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState<EditLeadForm | null>(null)
  const [editStages, setEditStages] = useState<Stage[]>([])
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const user = getUser()

  // ── Load pipelines + field configs ──────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getPipelines(token).then(setPipelines).catch(() => {})
    getLeadFieldConfigs(token).then(setFieldConfigs).catch(() => {})
  }, [])

  // ── Auto-select first pipeline in kanban ────────────────────────────────────
  useEffect(() => {
    if (view === 'kanban' && !filterPipeline && pipelines.length > 0) {
      setFilterPipeline(pipelines[0].id)
    }
  }, [view, filterPipeline, pipelines])

  // ── Stages for kanban view ──────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'kanban' || !filterPipeline) { setStages([]); return }
    const token = getAccessToken()
    if (!token) return
    setLoadingStages(true)
    getStages(filterPipeline, token)
      .then(s => { setStages([...s].sort((a, b) => a.order - b.order)); setLoadingStages(false) })
      .catch(() => setLoadingStages(false))
  }, [view, filterPipeline])

  // ── Load leads ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    getLeads(token, { pipelineId: filterPipeline || undefined, status: filterStatus || undefined })
      .then(data => { setLeads(data); setLoading(false) })
      .catch(() => { setError(t('loadError')); setLoading(false) })
  }, [filterPipeline, filterStatus, t])

  function refreshLeads() {
    const token = getAccessToken()
    if (!token) return
    getLeads(token, { pipelineId: filterPipeline || undefined, status: filterStatus || undefined })
      .then(setLeads).catch(() => {})
  }

  // ── Kanban drag ─────────────────────────────────────────────────────────────
  async function moveLead(leadId: string, targetStageId: string) {
    const token = getAccessToken()
    if (!token) return
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l))
    try {
      await updateLead(leadId, { stageId: targetStageId }, token)
    } catch { refreshLeads() }
  }

  // ── Stage change from list view ─────────────────────────────────────────────
  async function changeStage(leadId: string, stageId: string) {
    const token = getAccessToken()
    if (!token) return
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId } : l))
    try {
      await updateLead(leadId, { stageId }, token)
    } catch { refreshLeads() }
  }

  // ── Open edit modal ─────────────────────────────────────────────────────────
  async function openEdit(lead: Lead) {
    setEditLead(lead)
    setEditForm(leadToForm(lead))
    setModalError(null)
    // Load stages for this lead's pipeline
    const token = getAccessToken()
    if (!token) return
    try {
      const s = await getStages(lead.pipelineId, token)
      setEditStages([...s].sort((a, b) => a.order - b.order))
    } catch { setEditStages([]) }
  }

  // ── Save edits ──────────────────────────────────────────────────────────────
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editLead || !editForm) return
    const token = getAccessToken()
    if (!token) return

    setSaving(true)
    setModalError(null)
    try {
      const payload: UpdateLeadPayload = {
        name: editForm.name,
        stageId: editForm.stageId,
        status: editForm.status,
        value: editForm.value !== '' ? parseFloat(editForm.value) : undefined,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        customFields: Object.fromEntries(
          Object.entries(editForm.customFields).filter(([, v]) => v !== '')
        ),
      }
      const updated = await updateLead(editLead.id, payload, token)
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
      if (detailLead?.id === updated.id) setDetailLead(updated)
      setEditLead(null)
      setEditForm(null)
    } catch (err: any) {
      setModalError(err?.detail ?? t('editError'))
    } finally {
      setSaving(false)
    }
  }

  // ── Soft delete ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteLead) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setModalError(null)
    try {
      await softDeleteLead(deleteLead.id, token)
      setLeads(prev => prev.filter(l => l.id !== deleteLead.id))
      if (detailLead?.id === deleteLead.id) setDetailLead(null)
      setDeleteLead(null)
    } catch (err: any) {
      setModalError(err?.detail ?? t('deleteError'))
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loading || (view === 'kanban' && loadingStages)
  const canManage = user?.role !== 'AGENT'

  // Stages available for list-view stage selector: we collect as pipelines are loaded
  // For list view, we need stages keyed by pipelineId
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, Stage[]>>({})
  useEffect(() => {
    if (view !== 'list') return
    const token = getAccessToken()
    if (!token || pipelines.length === 0) return
    pipelines.forEach(p => {
      if (stagesByPipeline[p.id]) return
      getStages(p.id, token).then(s => {
        setStagesByPipeline(prev => ({ ...prev, [p.id]: [...s].sort((a, b) => a.order - b.order) }))
      }).catch(() => {})
    })
  }, [view, pipelines]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ color: '#e8e8f0', maxWidth: view === 'kanban' ? '100%' : '1000px' }}>
      {showCreate && (
        <CreateLeadModal
          pipelines={pipelines} fieldConfigs={fieldConfigs}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refreshLeads() }}
        />
      )}

      {detailLead && !editLead && !deleteLead && (
        <LeadDetailModal
          lead={detailLead} stages={view === 'kanban' ? stages : Object.values(stagesByPipeline).flat()}
          pipelines={pipelines} fieldConfigs={fieldConfigs} t={t}
          canManage={canManage}
          onClose={() => setDetailLead(null)}
          onEdit={() => openEdit(detailLead)}
          onDelete={() => { setDeleteLead(detailLead); setDetailLead(null) }}
        />
      )}

      {editLead && editForm && (
        <EditLeadModal
          lead={editLead} form={editForm} stages={editStages}
          fieldConfigs={fieldConfigs} pipelines={pipelines} t={t}
          saving={saving} error={modalError}
          onChange={setEditForm}
          onSubmit={handleEdit}
          onClose={() => { setEditLead(null); setEditForm(null); setModalError(null) }}
        />
      )}

      {deleteLead && (
        <DeleteConfirmModal
          lead={deleteLead} saving={saving} error={modalError} t={t}
          onConfirm={handleDelete}
          onClose={() => { setDeleteLead(null); setModalError(null) }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: '4px 0 0' }}>{t('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', backgroundColor: '#1a1a2e', border: '1px solid #2a2a45', borderRadius: '8px', overflow: 'hidden' }}>
            <ViewToggleButton active={view === 'kanban'} onClick={() => setView('kanban')} title={t('kanbanView')} icon={<KanbanIcon />} />
            <ViewToggleButton active={view === 'list'} onClick={() => setView('list')} title={t('listView')} icon={<ListIcon />} />
          </div>
          {canManage && (
            <button onClick={() => setShowCreate(true)} style={{ backgroundColor: '#6c63ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('newLead')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)} style={selectStyle}>
          {view === 'list' && <option value="">{t('allPipelines')}</option>}
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">{t('allStatuses')}</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(`status.${s}` as any)}</option>)}
        </select>
      </div>

      {/* Content */}
      {isLoading ? <LoadingState view={view} />
        : error ? <ErrorState message={error} />
        : view === 'kanban' ? (
          <KanbanView
            leads={leads} stages={stages} pipelines={pipelines} fieldConfigs={fieldConfigs}
            canManage={canManage}
            onLeadMoved={moveLead}
            onLeadOpen={setDetailLead}
            onLeadEdit={openEdit}
            onLeadDelete={lead => setDeleteLead(lead)}
            t={t}
          />
        ) : leads.length === 0 ? <EmptyState t={t} /> : (
          <ListView
            leads={leads} pipelines={pipelines} stagesByPipeline={stagesByPipeline} fieldConfigs={fieldConfigs}
            canManage={canManage}
            onLeadOpen={setDetailLead}
            onLeadEdit={openEdit}
            onLeadDelete={lead => setDeleteLead(lead)}
            onStageChange={changeStage}
            t={t}
          />
        )}
    </div>
  )
}

// ── Lead detail modal ──────────────────────────────────────────────────────────

function LeadDetailModal({ lead, stages, pipelines, fieldConfigs, t, canManage, onClose, onEdit, onDelete }: {
  lead: Lead; stages: Stage[]; pipelines: Pipeline[]; fieldConfigs: LeadFieldConfig[]
  t: ReturnType<typeof useTranslations<'leads'>>; canManage: boolean
  onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const pipeline = pipelines.find(p => p.id === lead.pipelineId)
  const stage = stages.find(s => s.id === lead.stageId)
  const stageColor = expandHex(stage?.color ?? '#6c63ff')
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }
  const formattedValue = lead.value != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)
    : null
  const activeCustomFields = fieldConfigs.filter(f => f.isActive && f.key !== 'value')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox width={560}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #2a2a45' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8e8f0', lineHeight: 1.3, flex: 1 }}>{lead.name}</h2>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {canManage && (
                <>
                  <ActionBtn title="Editar" onClick={onEdit}><EditIcon /></ActionBtn>
                  <ActionBtn title="Excluir" onClick={onDelete} danger><TrashIcon /></ActionBtn>
                </>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
              {t(`status.${lead.status}` as any)}
            </span>
            {stage && (
              <span style={{ backgroundColor: `${stageColor}22`, color: stageColor, border: `1px solid ${stageColor}55`, borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
                {stage.name}
              </span>
            )}
            {pipeline && <span style={{ fontSize: '12px', color: '#8888aa' }}>{pipeline.name}</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {formattedValue && (
            <Section label={t('value')}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#6bffb8' }}>{formattedValue}</span>
            </Section>
          )}
          {activeCustomFields.length > 0 && (
            <Section label={t('detail.fields')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {activeCustomFields.map(f => {
                  const val = lead.customFields?.[f.key]
                  return (
                    <div key={f.key} style={{ backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '10px 12px', border: '1px solid #2a2a45' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</p>
                      <p style={{ margin: 0, fontSize: '14px', color: val != null ? '#e8e8f0' : '#555570' }}>{val != null ? String(val) : '—'}</p>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
          {lead.tags && lead.tags.length > 0 && (
            <Section label={t('detail.tags')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lead.tags.map(tag => (
                  <span key={tag} style={{ backgroundColor: 'rgba(108,99,255,0.15)', color: '#6c63ff', border: '1px solid rgba(108,99,255,0.4)', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
            </Section>
          )}
          <Section label={t('detail.info')}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <DateField label={t('createdAt')} value={lead.createdAt} />
              <DateField label={t('detail.updatedAt')} value={lead.updatedAt} />
            </div>
          </Section>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a45' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #2a2a45', background: 'none', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }}>
            {t('detail.close')}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ── Edit lead modal ────────────────────────────────────────────────────────────

function EditLeadModal({ lead, form, stages, fieldConfigs, pipelines, t, saving, error, onChange, onSubmit, onClose }: {
  lead: Lead; form: EditLeadForm; stages: Stage[]; fieldConfigs: LeadFieldConfig[]; pipelines: Pipeline[]
  t: ReturnType<typeof useTranslations<'leads'>>; saving: boolean; error: string | null
  onChange: (f: EditLeadForm) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void
}) {
  const activeCustomFields = fieldConfigs.filter(f => f.isActive)
  const valueConfig = fieldConfigs.find(f => f.key === 'value')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox width={520}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #2a2a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>{t('edit.title')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(90vh - 160px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && <ErrorBanner>{error}</ErrorBanner>}

            <FormField label={t('modal.name')}>
              <input type="text" required minLength={2} value={form.name}
                onChange={e => onChange({ ...form, name: e.target.value })} style={inputStyle} />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label={t('edit.stage')}>
                <select value={form.stageId} onChange={e => onChange({ ...form, stageId: e.target.value })} style={inputStyle}>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormField>

              <FormField label={t('edit.status')}>
                <select value={form.status} onChange={e => onChange({ ...form, status: e.target.value as LeadStatus })} style={inputStyle}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(`status.${s}` as any)}</option>)}
                </select>
              </FormField>
            </div>

            {(valueConfig?.isActive ?? true) && (
              <FormField label={t('modal.value')}>
                <input type="number" min={0} step="0.01" value={form.value}
                  onChange={e => onChange({ ...form, value: e.target.value })}
                  placeholder={t('modal.valuePlaceholder')} style={inputStyle} />
              </FormField>
            )}

            <FormField label={t('edit.tags')}>
              <input type="text" value={form.tags}
                onChange={e => onChange({ ...form, tags: e.target.value })}
                placeholder={t('edit.tagsPlaceholder')} style={inputStyle} />
            </FormField>

            {activeCustomFields.filter(f => f.key !== 'value').map(f => (
              <FormField key={f.key} label={f.label}>
                {f.type === 'SELECT' ? (
                  <select value={form.customFields[f.key] ?? ''} onChange={e => onChange({ ...form, customFields: { ...form.customFields, [f.key]: e.target.value } })} style={inputStyle}>
                    <option value="">—</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === 'NUMBER' ? 'number' : f.type === 'EMAIL' ? 'email' : f.type === 'DATE' ? 'date' : 'text'}
                    value={form.customFields[f.key] ?? ''}
                    onChange={e => onChange({ ...form, customFields: { ...form.customFields, [f.key]: e.target.value } })}
                    required={f.isRequired}
                    style={inputStyle}
                  />
                )}
              </FormField>
            ))}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a45', display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>{t('modal.cancel')}</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: saving ? '#4a4370' : '#6c63ff', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? t('edit.saving') : t('edit.save')}
            </button>
          </div>
        </form>
      </ModalBox>
    </Backdrop>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ lead, saving, error, t, onConfirm, onClose }: {
  lead: Lead; saving: boolean; error: string | null
  t: ReturnType<typeof useTranslations<'leads'>>; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <ModalBox width={400}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #2a2a45' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>{t('delete.title')}</h2>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#c0c0d8', lineHeight: 1.6 }}>
            {t('delete.confirm', { name: lead.name })}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>{t('modal.cancel')}</button>
            <button type="button" onClick={onConfirm} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ef4444aa', backgroundColor: saving ? '#5c2626' : '#ef444422', color: '#f87171', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? t('delete.deleting') : t('delete.confirm_btn')}
            </button>
          </div>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ── View toggle ────────────────────────────────────────────────────────────────

function ViewToggleButton({ active, onClick, title, icon }: { active: boolean; onClick: () => void; title: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{ background: active ? '#6c63ff' : 'none', border: 'none', color: active ? '#fff' : '#8888aa', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}>
      {icon}
    </button>
  )
}

// ── Kanban ─────────────────────────────────────────────────────────────────────

function KanbanView({ leads, stages, pipelines, fieldConfigs, canManage, onLeadMoved, onLeadOpen, onLeadEdit, onLeadDelete, t }: {
  leads: Lead[]; stages: Stage[]; pipelines: Pipeline[]; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onLeadMoved: (leadId: string, targetStageId: string) => void
  onLeadOpen: (lead: Lead) => void; onLeadEdit: (lead: Lead) => void; onLeadDelete: (lead: Lead) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find(l => l.id === event.active.id) ?? null)
  }
  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return
    const lead = leads.find(l => l.id === active.id)
    if (!lead || lead.stageId === over.id) return
    onLeadMoved(active.id as string, over.id as string)
  }

  if (stages.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#8888aa', fontSize: '14px' }}>{t('noStages')}</div>
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
        {stages.map(stage => (
          <KanbanColumn key={stage.id} stage={stage} leads={leads.filter(l => l.stageId === stage.id)} fieldConfigs={fieldConfigs} canManage={canManage} onLeadOpen={onLeadOpen} onLeadEdit={onLeadEdit} onLeadDelete={onLeadDelete} t={t} />
        ))}
      </div>
      <DragOverlay>
        {activeLead && <LeadKanbanCard lead={activeLead} fieldConfigs={fieldConfigs} t={t} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ stage, leads, fieldConfigs, canManage, onLeadOpen, onLeadEdit, onLeadDelete, t }: {
  stage: Stage; leads: Lead[]; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onLeadOpen: (lead: Lead) => void; onLeadEdit: (lead: Lead) => void; onLeadDelete: (lead: Lead) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id })
  const color = expandHex(stage.color ?? '#6c63ff')

  return (
    <div ref={setNodeRef} style={{ width: '260px', flexShrink: 0, backgroundColor: isOver ? `${color}22` : `${color}12`, border: `1px solid ${isOver ? color : `${color}55`}`, borderRadius: '12px', transition: 'background 0.15s, border-color 0.15s', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${color}40`, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#e8e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.name}</span>
        <span style={{ backgroundColor: `${color}30`, color, borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{leads.length}</span>
      </div>
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}>
        {leads.map(lead => (
          <DraggableLead key={lead.id} lead={lead} fieldConfigs={fieldConfigs} canManage={canManage} onOpen={onLeadOpen} onEdit={onLeadEdit} onDelete={onLeadDelete} t={t} />
        ))}
      </div>
    </div>
  )
}

function DraggableLead({ lead, fieldConfigs, canManage, onOpen, onEdit, onDelete, t }: {
  lead: Lead; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onOpen: (lead: Lead) => void; onEdit: (lead: Lead) => void; onDelete: (lead: Lead) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const hasDraggedRef = useRef(false)
  const dndPointerDown = (listeners as any)?.onPointerDown as ((e: React.PointerEvent) => void) | undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        startPosRef.current = { x: e.clientX, y: e.clientY }
        hasDraggedRef.current = false
        dndPointerDown?.(e)
      }}
      onPointerMove={(e) => {
        if (!startPosRef.current) return
        if (Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y) > 5) {
          hasDraggedRef.current = true
        }
      }}
      onClick={() => { if (!hasDraggedRef.current) onOpen(lead) }}
      style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, opacity: isDragging ? 0.3 : 1, touchAction: 'none' }}
    >
      <LeadKanbanCard lead={lead} fieldConfigs={fieldConfigs} canManage={canManage} onEdit={onEdit} onDelete={onDelete} t={t} />
    </div>
  )
}

function LeadKanbanCard({ lead, fieldConfigs, canManage, onEdit, onDelete, t, isDragging = false }: {
  lead: Lead; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onEdit: (lead: Lead) => void; onDelete: (lead: Lead) => void
  t: ReturnType<typeof useTranslations<'leads'>>; isDragging?: boolean
}) {
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }
  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.value)
    : null
  const visibleCustomFields = fieldConfigs.filter(f => f.isActive && f.key !== 'value' && lead.customFields?.[f.key] != null).slice(0, 2)

  return (
    <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a45', borderRadius: '8px', padding: '10px 12px', cursor: isDragging ? 'grabbing' : 'pointer', boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : 'none', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: '#e8e8f0', lineHeight: 1.4, flex: 1 }}>{lead.name}</p>
        {canManage && !isDragging && (
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <ActionBtn title={t('edit.title')} onClick={() => onEdit(lead)} small><EditIcon /></ActionBtn>
            <ActionBtn title={t('delete.title')} onClick={() => onDelete(lead)} danger small><TrashIcon /></ActionBtn>
          </div>
        )}
      </div>
      {visibleCustomFields.map(f => (
        <p key={f.key} style={{ margin: '0 0 4px', fontSize: '11px', color: '#8888aa' }}>
          <span style={{ fontWeight: 600 }}>{f.label}:</span> {String(lead.customFields![f.key])}
        </p>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {formattedValue ? <span style={{ fontSize: '12px', fontWeight: 600, color: '#6bffb8' }}>{formattedValue}</span> : <span style={{ fontSize: '12px', color: '#8888aa' }}>{t('noValue')}</span>}
        <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
          {t(`status.${lead.status}` as any)}
        </span>
      </div>
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────────

function ListView({ leads, pipelines, stagesByPipeline, fieldConfigs, canManage, onLeadOpen, onLeadEdit, onLeadDelete, onStageChange, t }: {
  leads: Lead[]; pipelines: Pipeline[]; stagesByPipeline: Record<string, Stage[]>; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onLeadOpen: (lead: Lead) => void; onLeadEdit: (lead: Lead) => void; onLeadDelete: (lead: Lead) => void
  onStageChange: (leadId: string, stageId: string) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {leads.map(lead => (
        <LeadListRow
          key={lead.id} lead={lead} pipelines={pipelines}
          stages={stagesByPipeline[lead.pipelineId] ?? []}
          fieldConfigs={fieldConfigs} canManage={canManage}
          onOpen={onLeadOpen} onEdit={onLeadEdit} onDelete={onLeadDelete}
          onStageChange={onStageChange} t={t}
        />
      ))}
    </div>
  )
}

function LeadListRow({ lead, pipelines, stages, fieldConfigs, canManage, onOpen, onEdit, onDelete, onStageChange, t }: {
  lead: Lead; pipelines: Pipeline[]; stages: Stage[]; fieldConfigs: LeadFieldConfig[]; canManage: boolean
  onOpen: (lead: Lead) => void; onEdit: (lead: Lead) => void; onDelete: (lead: Lead) => void
  onStageChange: (leadId: string, stageId: string) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const [hovered, setHovered] = useState(false)
  const pipeline = pipelines.find(p => p.id === lead.pipelineId)
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }
  const formattedDate = new Date(lead.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.value)
    : null
  const visibleCustomFields = fieldConfigs.filter(f => f.isActive && f.key !== 'value' && lead.customFields?.[f.key] != null).slice(0, 2)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: '#16213e', borderRadius: '12px', border: `1px solid ${hovered ? '#3a3a5a' : '#2a2a45'}`, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: '12px', transition: 'border-color 0.15s' }}
    >
      {/* Name + pipeline + custom fields — clickable area */}
      <div onClick={() => onOpen(lead)} style={{ cursor: 'pointer', minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: hovered ? '#a09fff' : '#e8e8f0', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</p>
        {pipeline && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8888aa' }}>{pipeline.name}</p>}
        {visibleCustomFields.map(f => <p key={f.key} style={{ margin: '2px 0 0', fontSize: '12px', color: '#8888aa' }}>{f.label}: {String(lead.customFields![f.key])}</p>)}
      </div>

      {/* Stage selector */}
      {stages.length > 0 ? (
        <select
          value={lead.stageId}
          onChange={e => { e.stopPropagation(); onStageChange(lead.id, e.target.value) }}
          onClick={e => e.stopPropagation()}
          style={{ ...selectStyle, fontSize: '12px', padding: '6px 10px', maxWidth: '140px' }}
        >
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : <span />}

      {/* Value + status */}
      <span style={{ fontSize: '13px', fontWeight: 600, color: formattedValue ? '#e8e8f0' : '#555570', whiteSpace: 'nowrap' }}>
        {formattedValue ?? <span style={{ fontWeight: 400 }}>{t('noValue')}</span>}
      </span>

      <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {t(`status.${lead.status}` as any)}
      </span>

      {/* Date + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: '#8888aa', whiteSpace: 'nowrap' }}>{formattedDate}</span>
        {canManage && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <ActionBtn title={t('edit.title')} onClick={() => onEdit(lead)} small><EditIcon /></ActionBtn>
            <ActionBtn title={t('delete.title')} onClick={() => onDelete(lead)} danger small><TrashIcon /></ActionBtn>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Loading / Error / Empty ────────────────────────────────────────────────────

function LoadingState({ view }: { view: View }) {
  if (view === 'kanban') return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {[1, 2, 3, 4].map(i => <div key={i} style={{ width: '260px', flexShrink: 0, backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', height: '200px', opacity: 0.4 }} />)}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map(i => <div key={i} style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', padding: '16px 20px', height: '64px', opacity: 0.4 }} />)}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#ff6b6b', fontSize: '14px' }}>{message}</div>
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'leads'>> }) {
  return (
    <div style={{ padding: '48px 40px', backgroundColor: '#16213e', borderRadius: '16px', border: '1px dashed #2a2a45', textAlign: 'center', color: '#8888aa' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.4 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>{t('empty')}</p>
      <p style={{ margin: 0, fontSize: '13px' }}>{t('emptyDesc')}</p>
    </div>
  )
}

// ── Shared UI primitives ───────────────────────────────────────────────────────

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

function ModalBox({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#16213e', borderRadius: '16px', border: '1px solid #2a2a45', width: `${width}px`, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {children}
    </div>
  )
}

function DateField({ label, value }: { label: string; value: string }) {
  const formatted = new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#8888aa' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '13px', color: '#c0c0d8' }}>{formatted}</p>
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171' }}>{children}</div>
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8888aa', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function ActionBtn({ children, onClick, title, danger, small }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; small?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: '1px solid', borderRadius: '5px', cursor: 'pointer', padding: small ? '3px 5px' : '5px 7px', display: 'flex', alignItems: 'center', color: danger ? '#f87171' : '#8888aa', borderColor: danger ? '#f8717130' : '#2a2a4555' }}>
      {children}
    </button>
  )
}

// ── icons ──────────────────────────────────────────────────────────────────────

function EditIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function expandHex(color: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
  return color
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', backgroundColor: '#1a1a2e', border: '1px solid #2a2a45', borderRadius: '8px', color: '#e8e8f0', fontSize: '14px', boxSizing: 'border-box' }
const ghostBtnStyle: React.CSSProperties = { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2a2a45', background: 'none', color: '#8888aa', fontSize: '14px', cursor: 'pointer' }

function KanbanIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="12" rx="1" /></svg>
}
function ListIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
}
