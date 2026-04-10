'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getAccessToken } from '@/lib/auth'
import {
  getPipelines,
  createPipeline,
  deletePipeline,
  getStages,
  createStage,
  updateStage,
  reorderStages,
  Pipeline,
  Stage,
} from '@/lib/api'

// ── Preset color palette ──────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6c63ff', '#748ffc', '#4dabf7', '#4fcbff',
  '#63e6be', '#69db7c', '#a9e34b', '#ffd43b',
  '#ffa94d', '#ff922b', '#ff6b6b', '#ff8787',
  '#f783ac', '#da77f2', '#e599f7', '#8888aa',
]

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (color: string) => void
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCustom = value !== '' && !PRESET_COLORS.includes(value)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <label style={labelStyle}>{label}</label>
        {value && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: `${value}22`,
            border: `1px solid ${value}66`,
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: value,
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: value, display: 'inline-block' }} />
            {value.toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value === c ? '' : c)}
            title={c}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: c,
              border: value === c ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
              outline: value === c ? `2px solid ${c}` : 'none',
              outlineOffset: '1px',
              transition: 'transform 0.1s',
              transform: value === c ? 'scale(1.15)' : 'scale(1)',
              flexShrink: 0,
            }}
          />
        ))}

        {/* Custom color wheel button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Cor personalizada"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: isCustom
              ? value
              : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            border: isCustom ? '2px solid #fff' : '2px solid transparent',
            outline: isCustom ? `2px solid ${value}` : 'none',
            outlineOffset: '1px',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transform: isCustom ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.1s',
          }}
        />
        <input
          ref={inputRef}
          type="color"
          value={value || '#6c63ff'}
          onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          tabIndex={-1}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Remover cor"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'none',
              border: '1px dashed #4a4a6a',
              cursor: 'pointer',
              color: '#8888aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
              fontSize: '14px',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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

export default function PipelinesPage() {
  const t = useTranslations('pipelines')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stagesMap, setStagesMap] = useState<Record<string, Stage[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stageModalPipelineId, setStageModalPipelineId] = useState<string | null>(null)
  const [editStage, setEditStage] = useState<{ pipelineId: string; stage: Stage } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pipeline | null>(null)

  async function load() {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await getPipelines(token)
      setPipelines(data)
      const entries = await Promise.all(
        data.map(async p => {
          const stages = await getStages(p.id, token).catch(() => [] as Stage[])
          return [p.id, [...stages].sort((a, b) => a.order - b.order)] as [string, Stage[]]
        }),
      )
      setStagesMap(Object.fromEntries(entries))
    } catch {
      setError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(pipeline: Pipeline) {
    const token = getAccessToken()
    if (!token) return
    await deletePipeline(pipeline.id, token).catch(() => {})
    setDeleteTarget(null)
    load()
  }

  function onStageCreated(pipelineId: string, stage: Stage) {
    setStagesMap(prev => ({
      ...prev,
      [pipelineId]: [...(prev[pipelineId] ?? []), stage],
    }))
    setStageModalPipelineId(null)
  }

  async function onStageUpdated(pipelineId: string) {
    const token = getAccessToken()
    if (token) {
      const stages = await getStages(pipelineId, token).catch(() => [] as Stage[])
      setStagesMap(prev => ({
        ...prev,
        [pipelineId]: [...stages].sort((a, b) => a.order - b.order),
      }))
    }
    setEditStage(null)
  }

  async function handleReorder(pipelineId: string, newStages: Stage[]) {
    const token = getAccessToken()
    if (!token) return
    setStagesMap(prev => ({ ...prev, [pipelineId]: newStages }))
    const order = newStages.map((s, idx) => ({ stageId: s.id, order: idx + 1 }))
    await reorderStages(pipelineId, order, token).catch(() => {})
  }

  return (
    <div style={{ maxWidth: '900px', color: '#e8e8f0' }}>
      {showCreateModal && (
        <CreatePipelineModal t={t} onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); load() }} />
      )}
      {stageModalPipelineId && (
        <CreateStageModal
          t={t}
          pipelineId={stageModalPipelineId}
          nextOrder={(stagesMap[stageModalPipelineId]?.length ?? 0) + 1}
          onClose={() => setStageModalPipelineId(null)}
          onCreated={stage => onStageCreated(stageModalPipelineId, stage)}
        />
      )}
      {editStage && (
        <EditStageModal
          t={t}
          pipelineId={editStage.pipelineId}
          stage={editStage.stage}
          onClose={() => setEditStage(null)}
          onUpdated={() => onStageUpdated(editStage.pipelineId)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal t={t} pipeline={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: '4px 0 0' }}>{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ backgroundColor: '#6c63ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('newPipeline')}
        </button>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : pipelines.length === 0 ? (
        <EmptyState t={t} onNew={() => setShowCreateModal(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pipelines.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              stages={stagesMap[pipeline.id] ?? []}
              t={t}
              onAddStage={() => setStageModalPipelineId(pipeline.id)}
              onDelete={() => setDeleteTarget(pipeline)}
              onEditStage={stage => setEditStage({ pipelineId: pipeline.id, stage })}
              onReorder={newStages => handleReorder(pipeline.id, newStages)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── SortableStageChip ────────────────────────────────────────────────────────

function SortableStageChip({
  stage,
  onEdit,
}: {
  stage: Stage
  onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
      }}
    >
      {/* drag handle */}
      <span
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', color: '#4a4a6a', display: 'flex', alignItems: 'center', padding: '2px' }}
        title="Arrastar"
      >
        <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" /><circle cx="7" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="7" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" /><circle cx="7" cy="13" r="1.5" />
        </svg>
      </span>

      <span
        style={{
          backgroundColor: stage.color ? `${stage.color}22` : 'rgba(108,99,255,0.12)',
          color: stage.color ?? '#6c63ff',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 600,
          border: `1px solid ${stage.color ? `${stage.color}44` : 'rgba(108,99,255,0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {stage.name}
        <button
          onClick={onEdit}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.6 }}
          title="Editar"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </span>
    </div>
  )
}

// ── PipelineCard ─────────────────────────────────────────────────────────────

function PipelineCard({
  pipeline,
  stages,
  t,
  onAddStage,
  onDelete,
  onEditStage,
  onReorder,
}: {
  pipeline: Pipeline
  stages: Stage[]
  t: ReturnType<typeof useTranslations<'pipelines'>>
  onAddStage: () => void
  onDelete: () => void
  onEditStage: (stage: Stage) => void
  onReorder: (newStages: Stage[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stages.findIndex(s => s.id === active.id)
    const newIndex = stages.findIndex(s => s.id === over.id)
    onReorder(arrayMove(stages, oldIndex, newIndex))
  }

  return (
    <div style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', padding: '20px' }}>
      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#e8e8f0' }}>{pipeline.name}</p>
          <span style={{
            backgroundColor: pipeline.isActive ? 'rgba(107,255,184,0.15)' : 'rgba(136,136,170,0.15)',
            color: pipeline.isActive ? '#6bffb8' : '#8888aa',
            borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
          }}>
            {pipeline.isActive ? t('active') : t('inactive')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onAddStage} style={{ background: 'none', border: '1px solid #2a2a45', borderRadius: '6px', color: '#6c63ff', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addStage')}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', color: '#ff6b6b', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sortable stages */}
      {stages.length === 0 ? (
        <span style={{ fontSize: '12px', color: '#8888aa' }}>{t('noStages')}</span>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {stages.map((stage, idx) => (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {idx > 0 && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3a3a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  <SortableStageChip stage={stage} onEdit={() => onEditStage(stage)} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────

function CreatePipelineModal({ t, onClose, onCreated }: {
  t: ReturnType<typeof useTranslations<'pipelines'>>
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const token = getAccessToken()
    if (!token) return
    setSubmitting(true); setError('')
    try {
      await createPipeline({ name: name.trim() }, token)
      onCreated()
    } catch (err: unknown) {
      setError((err as { title?: string })?.title ?? t('createModal.errorGeneric'))
      setSubmitting(false)
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <ModalBox>
        <ModalHeader title={t('createModal.title')} onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>{t('createModal.name')} *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('createModal.namePlaceholder')} style={inputStyle} />
          </div>
          {error && <p style={{ margin: 0, fontSize: '13px', color: '#ff6b6b' }}>{error}</p>}
          <ModalActions onCancel={onClose} cancelLabel={t('createModal.cancel')} submitLabel={submitting ? t('createModal.creating') : t('createModal.create')} submitting={submitting} disabled={!name.trim() || submitting} />
        </form>
      </ModalBox>
    </Backdrop>
  )
}

function CreateStageModal({ t, pipelineId, nextOrder, onClose, onCreated }: {
  t: ReturnType<typeof useTranslations<'pipelines'>>
  pipelineId: string
  nextOrder: number
  onClose: () => void
  onCreated: (stage: Stage) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const token = getAccessToken()
    if (!token) return
    setSubmitting(true); setError('')
    try {
      const stage = await createStage(pipelineId, { name: name.trim(), order: nextOrder, color: color.trim() || undefined }, token)
      onCreated(stage)
    } catch (err: unknown) {
      setError((err as { title?: string })?.title ?? t('stageModal.errorGeneric'))
      setSubmitting(false)
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <ModalBox>
        <ModalHeader title={t('stageModal.title')} onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>{t('stageModal.name')} *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('stageModal.namePlaceholder')} style={inputStyle} />
          </div>
          <ColorPicker value={color} onChange={setColor} label={t('stageModal.color')} />
          {error && <p style={{ margin: 0, fontSize: '13px', color: '#ff6b6b' }}>{error}</p>}
          <ModalActions onCancel={onClose} cancelLabel={t('stageModal.cancel')} submitLabel={submitting ? t('stageModal.creating') : t('stageModal.create')} submitting={submitting} disabled={!name.trim() || submitting} />
        </form>
      </ModalBox>
    </Backdrop>
  )
}

function EditStageModal({ t, pipelineId, stage, onClose, onUpdated }: {
  t: ReturnType<typeof useTranslations<'pipelines'>>
  pipelineId: string
  stage: Stage
  onClose: () => void
  onUpdated: () => void
}) {
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const token = getAccessToken()
    if (!token) return
    setSubmitting(true); setError('')
    try {
      await updateStage(pipelineId, stage.id, { name: name.trim(), color: color.trim() || undefined }, token)
      onUpdated()
    } catch (err: unknown) {
      setError((err as { title?: string })?.title ?? t('editStageModal.errorGeneric'))
      setSubmitting(false)
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <ModalBox>
        <ModalHeader title={t('editStageModal.title')} onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>{t('editStageModal.name')} *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <ColorPicker value={color} onChange={setColor} label={t('editStageModal.color')} />
          {error && <p style={{ margin: 0, fontSize: '13px', color: '#ff6b6b' }}>{error}</p>}
          <ModalActions onCancel={onClose} cancelLabel={t('editStageModal.cancel')} submitLabel={submitting ? t('editStageModal.saving') : t('editStageModal.save')} submitting={submitting} disabled={!name.trim() || submitting} />
        </form>
      </ModalBox>
    </Backdrop>
  )
}

function DeleteConfirmModal({ t, pipeline, onCancel, onConfirm }: {
  t: ReturnType<typeof useTranslations<'pipelines'>>
  pipeline: Pipeline
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Backdrop onClick={onCancel}>
      <ModalBox>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#e8e8f0' }}>{t('deleteConfirm')}</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#8888aa' }}>
            <strong style={{ color: '#e8e8f0' }}>{pipeline.name}</strong> — {t('deleteConfirmDesc')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'none', border: '1px solid #2a2a45', borderRadius: '8px', color: '#8888aa', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
            {t('createModal.cancel')}
          </button>
          <button onClick={onConfirm} style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {t('deleteButton')}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Backdrop({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClick() }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      {children}
    </div>
  )
}

function ModalBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#16213e', border: '1px solid #2a2a45', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px 32px' }}>
      {children}
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8e8f0' }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

function ModalActions({ onCancel, cancelLabel, submitLabel, submitting, disabled }: {
  onCancel: () => void
  cancelLabel: string
  submitLabel: string
  submitting: boolean
  disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
      <button type="button" onClick={onCancel} style={{ background: 'none', border: '1px solid #2a2a45', borderRadius: '8px', color: '#8888aa', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
        {cancelLabel}
      </button>
      <button type="submit" disabled={disabled} style={{ backgroundColor: disabled ? '#2a2a45' : '#6c63ff', color: disabled ? '#8888aa' : '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {submitting && <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
        {submitLabel}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #2a2a45', padding: '20px', height: '80px', opacity: 0.5 }} />
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#ff6b6b', fontSize: '14px' }}>
      {message}
    </div>
  )
}

function EmptyState({ t, onNew }: { t: ReturnType<typeof useTranslations<'pipelines'>>; onNew: () => void }) {
  return (
    <div style={{ padding: '48px 40px', backgroundColor: '#16213e', borderRadius: '16px', border: '1px dashed #2a2a45', textAlign: 'center', color: '#8888aa' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.4 }}>
        <rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" />
      </svg>
      <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>{t('empty')}</p>
      <p style={{ margin: '0 0 20px', fontSize: '13px' }}>{t('emptyDesc')}</p>
      <button onClick={onNew} style={{ backgroundColor: '#6c63ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
        {t('newPipeline')}
      </button>
    </div>
  )
}
