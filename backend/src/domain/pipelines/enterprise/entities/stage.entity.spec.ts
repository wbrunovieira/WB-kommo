import { describe, it, expect } from 'vitest'
import { Stage } from './stage.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

describe('Stage entity', () => {
  it('create() assigns all fields', () => {
    const stage = Stage.create({
      pipelineId: 'pipeline-1',
      name: 'Qualified',
      order: 2,
      color: '#FF5733',
    })

    expect(stage.pipelineId).toBe('pipeline-1')
    expect(stage.name).toBe('Qualified')
    expect(stage.order).toBe(2)
    expect(stage.color).toBe('#FF5733')
    expect(stage.createdAt).toBeInstanceOf(Date)
    expect(stage.updatedAt).toBeInstanceOf(Date)
  })

  it('create() works without color', () => {
    const stage = Stage.create({ pipelineId: 'pipeline-1', name: 'New', order: 1 })
    expect(stage.color).toBeUndefined()
  })

  it('reorder() updates order', () => {
    const stage = Stage.create({ pipelineId: 'pipeline-1', name: 'New', order: 1 })
    stage.reorder(5)
    expect(stage.order).toBe(5)
  })

  it('rename() updates name', () => {
    const stage = Stage.create({ pipelineId: 'pipeline-1', name: 'New', order: 1 })
    stage.rename('Updated Name')
    expect(stage.name).toBe('Updated Name')
  })

  it('reconstitute() restores all fields', () => {
    const id = new UniqueEntityID('stage-xyz')
    const createdAt = new Date('2024-01-01')
    const updatedAt = new Date('2024-06-01')

    const stage = Stage.reconstitute(
      { pipelineId: 'pipeline-1', name: 'Closed', order: 3, color: '#00FF00', createdAt, updatedAt },
      id,
    )

    expect(stage.id.toString()).toBe('stage-xyz')
    expect(stage.pipelineId).toBe('pipeline-1')
    expect(stage.name).toBe('Closed')
    expect(stage.order).toBe(3)
    expect(stage.color).toBe('#00FF00')
    expect(stage.createdAt).toBe(createdAt)
    expect(stage.updatedAt).toBe(updatedAt)
  })
})
