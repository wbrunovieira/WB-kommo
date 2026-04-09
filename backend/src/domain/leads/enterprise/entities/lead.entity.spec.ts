import { describe, it, expect } from 'vitest'
import { Lead } from './lead.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

describe('Lead entity', () => {
  const baseProps = {
    tenantId: 'tenant-1',
    pipelineId: 'pipeline-1',
    stageId: 'stage-1',
    name: 'Acme Corp Deal',
  }

  it('create() sets status OPEN and deletedAt undefined', () => {
    const lead = Lead.create(baseProps)

    expect(lead.tenantId).toBe('tenant-1')
    expect(lead.pipelineId).toBe('pipeline-1')
    expect(lead.stageId).toBe('stage-1')
    expect(lead.name).toBe('Acme Corp Deal')
    expect(lead.status).toBe('OPEN')
    expect(lead.deletedAt).toBeUndefined()
    expect(lead.deletedByUserId).toBeUndefined()
    expect(lead.tags).toEqual([])
    expect(lead.createdAt).toBeInstanceOf(Date)
    expect(lead.updatedAt).toBeInstanceOf(Date)
  })

  it('softDelete(userId) sets deletedAt and deletedByUserId', () => {
    const lead = Lead.create(baseProps)
    lead.softDelete('user-42')

    expect(lead.deletedAt).toBeInstanceOf(Date)
    expect(lead.deletedByUserId).toBe('user-42')
  })

  it('restore() clears deletedAt and deletedByUserId', () => {
    const lead = Lead.create(baseProps)
    lead.softDelete('user-42')
    lead.restore()

    expect(lead.deletedAt).toBeUndefined()
    expect(lead.deletedByUserId).toBeUndefined()
  })

  it('isDeleted() returns true only when deletedAt is set', () => {
    const lead = Lead.create(baseProps)
    expect(lead.isDeleted()).toBe(false)

    lead.softDelete('user-1')
    expect(lead.isDeleted()).toBe(true)

    lead.restore()
    expect(lead.isDeleted()).toBe(false)
  })

  it('updateStage() changes stageId', () => {
    const lead = Lead.create(baseProps)
    lead.updateStage('stage-2')
    expect(lead.stageId).toBe('stage-2')
  })

  it('updateValue() changes value', () => {
    const lead = Lead.create(baseProps)
    lead.updateValue(5000)
    expect(lead.value).toBe(5000)

    lead.updateValue(undefined)
    expect(lead.value).toBeUndefined()
  })

  it('markWon() sets status WON', () => {
    const lead = Lead.create(baseProps)
    lead.markWon()
    expect(lead.status).toBe('WON')
  })

  it('markLost() sets status LOST', () => {
    const lead = Lead.create(baseProps)
    lead.markLost()
    expect(lead.status).toBe('LOST')
  })

  it('reopen() sets status OPEN', () => {
    const lead = Lead.create(baseProps)
    lead.markWon()
    lead.reopen()
    expect(lead.status).toBe('OPEN')
  })

  it('assignTo() sets assignedToId', () => {
    const lead = Lead.create(baseProps)
    lead.assignTo('user-5')
    expect(lead.assignedToId).toBe('user-5')
  })

  it('addTag() adds tag without duplicates', () => {
    const lead = Lead.create(baseProps)
    lead.addTag('hot')
    lead.addTag('priority')
    lead.addTag('hot') // duplicate

    expect(lead.tags).toEqual(['hot', 'priority'])
    expect(lead.tags).toHaveLength(2)
  })

  it('removeTag() removes tag', () => {
    const lead = Lead.create({ ...baseProps, tags: ['hot', 'priority'] })
    lead.removeTag('hot')
    expect(lead.tags).toEqual(['priority'])
  })

  it('reconstitute() restores all fields including deletedAt', () => {
    const id = new UniqueEntityID('lead-123')
    const deletedAt = new Date('2024-06-01')
    const createdAt = new Date('2024-01-01')
    const updatedAt = new Date('2024-05-01')

    const lead = Lead.reconstitute(
      {
        tenantId: 'tenant-1',
        pipelineId: 'pipeline-1',
        stageId: 'stage-1',
        name: 'Old Lead',
        status: 'LOST',
        tags: ['cold'],
        value: 1000,
        assignedToId: 'user-3',
        deletedAt,
        deletedByUserId: 'user-9',
        createdAt,
        updatedAt,
      },
      id,
    )

    expect(lead.id.toString()).toBe('lead-123')
    expect(lead.status).toBe('LOST')
    expect(lead.deletedAt).toBe(deletedAt)
    expect(lead.deletedByUserId).toBe('user-9')
    expect(lead.tags).toEqual(['cold'])
    expect(lead.value).toBe(1000)
    expect(lead.assignedToId).toBe('user-3')
    expect(lead.createdAt).toBe(createdAt)
    expect(lead.updatedAt).toBe(updatedAt)
  })
})
