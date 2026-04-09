'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getAccessToken } from '@/lib/auth'
import { createLead, getStages, Pipeline, Stage } from '@/lib/api'

interface Props {
  pipelines: Pipeline[]
  onClose: () => void
  onCreated: () => void
}

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

export function CreateLeadModal({ pipelines, onClose, onCreated }: Props) {
  const t = useTranslations('leads')

  const [name, setName] = useState('')
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? '')
  const [stageId, setStageId] = useState('')
  const [stages, setStages] = useState<Stage[]>([])
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load stages when pipeline changes
  useEffect(() => {
    if (!pipelineId) return
    const token = getAccessToken()
    if (!token) return
    setStageId('')
    setStages([])
    getStages(pipelineId, token)
      .then(s => {
        setStages(s)
        if (s.length > 0) setStageId(s[0].id)
      })
      .catch(() => {})
  }, [pipelineId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !pipelineId || !stageId) return

    const token = getAccessToken()
    if (!token) return

    setSubmitting(true)
    setError('')
    try {
      await createLead(
        {
          name: name.trim(),
          pipelineId,
          stageId,
          value: value ? Number(value) : undefined,
        },
        token,
      )
      onCreated()
    } catch (err: unknown) {
      const apiErr = err as { title?: string }
      setError(apiErr?.title ?? t('modal.errorGeneric'))
      setSubmitting(false)
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSubmit = name.trim().length > 0 && pipelineId && stageId && !submitting

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#16213e',
        border: '1px solid #2a2a45',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        padding: '28px 32px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8e8f0' }}>
            {t('modal.title')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8888aa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>{t('modal.name')} *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('modal.namePlaceholder')}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Pipeline */}
          <div>
            <label style={labelStyle}>{t('modal.pipeline')} *</label>
            {pipelines.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0 }}>
                {t('modal.noPipelines')}
              </p>
            ) : (
              <select
                value={pipelineId}
                onChange={e => setPipelineId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Stage */}
          <div>
            <label style={labelStyle}>{t('modal.stage')} *</label>
            {stages.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#8888aa', margin: 0 }}>
                {pipelineId ? t('modal.loadingStages') : t('modal.selectPipelineFirst')}
              </p>
            ) : (
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Value */}
          <div>
            <label style={labelStyle}>{t('modal.value')}</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={t('modal.valuePlaceholder')}
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ margin: 0, fontSize: '13px', color: '#ff6b6b' }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid #2a2a45',
                borderRadius: '8px',
                color: '#8888aa',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? '#6c63ff' : '#2a2a45',
                color: canSubmit ? '#fff' : '#8888aa',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {submitting ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                  {t('modal.creating')}
                </>
              ) : t('modal.create')}
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
