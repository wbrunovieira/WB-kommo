'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getUser, getAccessToken } from '@/lib/auth'
import { getLeads, getPipelines, Lead, Pipeline } from '@/lib/api'
import { CreateLeadModal } from '@/components/create-lead-modal'

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

const statusColors: Record<string, { bg: string; color: string }> = {
  OPEN:  { bg: 'rgba(108, 99, 255, 0.15)', color: '#6c63ff' },
  WON:   { bg: 'rgba(107, 255, 184, 0.15)', color: '#6bffb8' },
  LOST:  { bg: 'rgba(255, 107, 107, 0.15)', color: '#ff6b6b' },
}

export default function LeadsPage() {
  const t = useTranslations('leads')
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const user = getUser()

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    Promise.all([
      getLeads(token, {
        pipelineId: filterPipeline || undefined,
        status: filterStatus || undefined,
      }),
      getPipelines(token),
    ])
      .then(([leadsData, pipelinesData]) => {
        setLeads(leadsData)
        setPipelines(pipelinesData)
        setLoading(false)
      })
      .catch(() => {
        setError(t('loadError'))
        setLoading(false)
      })
  }, [filterPipeline, filterStatus, t])

  function refreshLeads() {
    const token = getAccessToken()
    if (!token) return
    getLeads(token, {
      pipelineId: filterPipeline || undefined,
      status: filterStatus || undefined,
    }).then(setLeads).catch(() => {})
  }

  return (
    <div style={{ maxWidth: '1000px', color: '#e8e8f0' }}>
      {showModal && (
        <CreateLeadModal
          pipelines={pipelines}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refreshLeads() }}
        />
      )}
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', margin: 0 }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '13px', color: '#8888aa', margin: '4px 0 0' }}>
            {t('subtitle')}
          </p>
        </div>

        {/* New lead button — visible to ACCOUNT_ADMIN and MEMBER */}
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
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('newLead')}
          </button>
        )}
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
          <option value="">{t('allPipelines')}</option>
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
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : leads.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              pipelines={pipelines}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  pipelines,
  t,
}: {
  lead: Lead
  pipelines: Pipeline[]
  t: ReturnType<typeof useTranslations<'leads'>>
}) {
  const pipeline = pipelines.find(p => p.id === lead.pipelineId)
  const statusStyle = statusColors[lead.status] ?? { bg: 'transparent', color: '#8888aa' }

  const formattedDate = new Date(lead.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
      {/* Lead name */}
      <div style={{ flex: 1, minWidth: '160px' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#e8e8f0' }}>
          {lead.name}
        </p>
        {pipeline && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8888aa' }}>
            {t('pipeline')}: {pipeline.name}
          </p>
        )}
      </div>

      {/* Value */}
      <div style={{ minWidth: '100px', textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>
          {formattedValue ?? (
            <span style={{ color: '#8888aa', fontWeight: 400 }}>{t('noValue')}</span>
          )}
        </p>
      </div>

      {/* Status badge */}
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

      {/* Created at */}
      <p style={{ margin: 0, fontSize: '12px', color: '#8888aa', flexShrink: 0 }}>
        {formattedDate}
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          backgroundColor: '#16213e',
          borderRadius: '12px',
          border: '1px solid #2a2a45',
          padding: '16px 20px',
          height: '64px',
          opacity: 0.5,
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
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
      color: '#ff6b6b',
      fontSize: '14px',
    }}>
      {message}
    </div>
  )
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'leads'>> }) {
  return (
    <div style={{
      padding: '48px 40px',
      backgroundColor: '#16213e',
      borderRadius: '16px',
      border: '1px dashed #2a2a45',
      textAlign: 'center',
      color: '#8888aa',
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.4 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>
        {t('empty')}
      </p>
      <p style={{ margin: 0, fontSize: '13px' }}>
        {t('emptyDesc')}
      </p>
    </div>
  )
}
