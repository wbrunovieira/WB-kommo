'use client'

import { useEffect, useState } from 'react'
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
import { getLeads, getPipelines, getStages, updateLead, Lead, Pipeline, Stage } from '@/lib/api'
import { CreateLeadModal } from '@/components/create-lead-modal'

type View = 'kanban' | 'list'

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

export default function LeadsPage() {
  const t = useTranslations('leads')
  const [view, setView] = useState<View>('kanban')
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStages, setLoadingStages] = useState(false)
  const [error, setError] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const user = getUser()

  // Load pipelines on mount
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getPipelines(token).then(setPipelines).catch(() => {})
  }, [])

  // Auto-select first pipeline in kanban mode when none is selected
  useEffect(() => {
    if (view === 'kanban' && !filterPipeline && pipelines.length > 0) {
      setFilterPipeline(pipelines[0].id)
    }
  }, [view, filterPipeline, pipelines])

  // Load stages for the selected pipeline (kanban only)
  useEffect(() => {
    if (view !== 'kanban' || !filterPipeline) {
      setStages([])
      return
    }
    const token = getAccessToken()
    if (!token) return
    setLoadingStages(true)
    getStages(filterPipeline, token)
      .then(s => {
        setStages([...s].sort((a, b) => a.order - b.order))
        setLoadingStages(false)
      })
      .catch(() => setLoadingStages(false))
  }, [view, filterPipeline])

  // Load leads
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    getLeads(token, {
      pipelineId: filterPipeline || undefined,
      status: filterStatus || undefined,
    })
      .then(data => { setLeads(data); setLoading(false) })
      .catch(() => { setError(t('loadError')); setLoading(false) })
  }, [filterPipeline, filterStatus, t])

  function refreshLeads() {
    const token = getAccessToken()
    if (!token) return
    getLeads(token, {
      pipelineId: filterPipeline || undefined,
      status: filterStatus || undefined,
    }).then(setLeads).catch(() => {})
  }

  async function moveLead(leadId: string, targetStageId: string) {
    const token = getAccessToken()
    if (!token) return
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l))
    try {
      await updateLead(leadId, { stageId: targetStageId }, token)
    } catch {
      refreshLeads()
    }
  }

  const isLoading = loading || (view === 'kanban' && loadingStages)

  return (
    <div style={{ color: '#e8e8f0', maxWidth: view === 'kanban' ? '100%' : '1000px' }}>
      {showModal && (
        <CreateLeadModal
          pipelines={pipelines}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refreshLeads() }}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', margin: 0 }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: '4px 0 0' }}>
            {t('subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#1a1a2e',
            border: '1px solid #2a2a45',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <ViewToggleButton
              active={view === 'kanban'}
              onClick={() => setView('kanban')}
              title={t('kanbanView')}
              icon={<KanbanIcon />}
            />
            <ViewToggleButton
              active={view === 'list'}
              onClick={() => setView('list')}
              title={t('listView')}
              icon={<ListIcon />}
            />
          </div>

          {/* New lead button */}
          {(user?.role === 'PLATFORM_OWNER' || user?.role === 'ACCOUNT_ADMIN' || user?.role === 'MEMBER') && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                backgroundColor: '#6c63ff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
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
              {t('newLead')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#16213e',
        borderRadius: '12px',
        border: '1px solid #2a2a45',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <select
          value={filterPipeline}
          onChange={e => setFilterPipeline(e.target.value)}
          style={selectStyle}
        >
          {view === 'list' && <option value="">{t('allPipelines')}</option>}
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">{t('allStatuses')}</option>
          <option value="OPEN">{t('status.OPEN')}</option>
          <option value="WON">{t('status.WON')}</option>
          <option value="LOST">{t('status.LOST')}</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState view={view} />
      ) : error ? (
        <ErrorState message={error} />
      ) : view === 'kanban' ? (
        <KanbanView leads={leads} stages={stages} pipelines={pipelines} onLeadMoved={moveLead} t={t} />
      ) : leads.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <ListView leads={leads} pipelines={pipelines} t={t} />
      )}
    </div>
  )
}

// ── View toggle ────────────────────────────────────────────────────────────────

function ViewToggleButton({ active, onClick, title, icon }: {
  active: boolean
  onClick: () => void
  title: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? '#6c63ff' : 'none',
        border: 'none',
        color: active ? '#fff' : '#8888aa',
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.15s',
      }}
    >
      {icon}
    </button>
  )
}

// ── Kanban ─────────────────────────────────────────────────────────────────────

interface KanbanViewProps {
  leads: Lead[]
  stages: Stage[]
  pipelines: Pipeline[]
  onLeadMoved: (leadId: string, targetStageId: string) => void
  t: ReturnType<typeof useTranslations<'leads'>>
}

function KanbanView({ leads, stages, onLeadMoved, t }: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find(l => l.id === event.active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return
    const leadId = active.id as string
    const targetStageId = over.id as string
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stageId === targetStageId) return
    onLeadMoved(leadId, targetStageId)
  }

  if (stages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#8888aa', fontSize: '14px' }}>
        {t('noStages')}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '16px',
        alignItems: 'flex-start',
      }}>
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leads.filter(l => l.stageId === stage.id)}
            t={t}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && <LeadKanbanCard lead={activeLead} t={t} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ stage, leads, t }: {
  stage: Stage
  leads: Lead[]
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id })
  const color = expandHex(stage.color ?? '#6c63ff')

  return (
    <div
      ref={setNodeRef}
      style={{
        width: '260px',
        flexShrink: 0,
        backgroundColor: isOver ? `${color}22` : `${color}12`,
        border: `1px solid ${isOver ? color : `${color}55`}`,
        borderRadius: '12px',
        transition: 'background 0.15s, border-color 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${color}40`,
        backgroundColor: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#e8e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stage.name}
        </span>
        <span style={{
          backgroundColor: `${color}30`,
          color: color,
          borderRadius: '10px',
          padding: '1px 7px',
          fontSize: '11px',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}>
        {leads.map(lead => (
          <DraggableLead key={lead.id} lead={lead} t={t} />
        ))}
      </div>
    </div>
  )
}

function DraggableLead({ lead, t }: {
  lead: Lead
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        touchAction: 'none',
      }}
    >
      <LeadKanbanCard lead={lead} t={t} />
    </div>
  )
}

function LeadKanbanCard({ lead, t, isDragging = false }: {
  lead: Lead
  t: ReturnType<typeof useTranslations<'leads'>>
  isDragging?: boolean
}) {
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }
  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.value)
    : null

  return (
    <div style={{
      backgroundColor: '#1a1a2e',
      border: '1px solid #2a2a45',
      borderRadius: '8px',
      padding: '10px 12px',
      cursor: isDragging ? 'grabbing' : 'grab',
      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
      userSelect: 'none',
    }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '13px', color: '#e8e8f0', lineHeight: 1.4 }}>
        {lead.name}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {formattedValue ? (
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6bffb8' }}>{formattedValue}</span>
        ) : (
          <span style={{ fontSize: '12px', color: '#8888aa' }}>{t('noValue')}</span>
        )}
        <span style={{
          backgroundColor: statusStyle.bg,
          color: statusStyle.color,
          borderRadius: '4px',
          padding: '2px 7px',
          fontSize: '11px',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {t(`status.${lead.status}` as Parameters<typeof t>[0])}
        </span>
      </div>
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────────

function ListView({ leads, pipelines, t }: {
  leads: Lead[]
  pipelines: Pipeline[]
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {leads.map(lead => (
        <LeadListCard key={lead.id} lead={lead} pipelines={pipelines} t={t} />
      ))}
    </div>
  )
}

function LeadListCard({ lead, pipelines, t }: {
  lead: Lead
  pipelines: Pipeline[]
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const pipeline = pipelines.find(p => p.id === lead.pipelineId)
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }
  const formattedDate = new Date(lead.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.value)
    : null

  return (
    <div style={{
      backgroundColor: '#16213e',
      borderRadius: '12px',
      border: '1px solid #2a2a45',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '160px' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#e8e8f0' }}>{lead.name}</p>
        {pipeline && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8888aa' }}>
            {t('pipeline')}: {pipeline.name}
          </p>
        )}
      </div>
      <div style={{ minWidth: '100px', textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>
          {formattedValue ?? <span style={{ color: '#8888aa', fontWeight: 400 }}>{t('noValue')}</span>}
        </p>
      </div>
      <div style={{
        backgroundColor: statusStyle.bg,
        color: statusStyle.color,
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {t(`status.${lead.status}` as Parameters<typeof t>[0])}
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#8888aa', flexShrink: 0 }}>{formattedDate}</p>
    </div>
  )
}

// ── Loading / Error / Empty ────────────────────────────────────────────────────

function LoadingState({ view }: { view: View }) {
  if (view === 'kanban') {
    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: '260px', flexShrink: 0, backgroundColor: '#16213e',
            borderRadius: '12px', border: '1px solid #2a2a45', height: '200px', opacity: 0.4,
          }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          backgroundColor: '#16213e', borderRadius: '12px',
          border: '1px solid #2a2a45', padding: '16px 20px', height: '64px', opacity: 0.4,
        }} />
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      border: '1px solid rgba(255, 107, 107, 0.3)',
      borderRadius: '12px', padding: '24px', textAlign: 'center',
      color: '#ff6b6b', fontSize: '14px',
    }}>
      {message}
    </div>
  )
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'leads'>> }) {
  return (
    <div style={{
      padding: '48px 40px', backgroundColor: '#16213e',
      borderRadius: '16px', border: '1px dashed #2a2a45',
      textAlign: 'center', color: '#8888aa',
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.4 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>{t('empty')}</p>
      <p style={{ margin: 0, fontSize: '13px' }}>{t('emptyDesc')}</p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Expands #rgb shorthand to #rrggbb so hex-alpha concatenation works correctly. */
function expandHex(color: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
  }
  return color
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function KanbanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="12" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
