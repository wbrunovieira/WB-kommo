import { describe, it, expect } from 'vitest'
import { Pipeline } from './pipeline.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

describe('Pipeline entity', () => {
  it('create() defaults isActive to true', () => {
    const pipeline = Pipeline.create({ tenantId: 'tenant-1', name: 'Sales' })

    expect(pipeline.tenantId).toBe('tenant-1')
    expect(pipeline.name).toBe('Sales')
    expect(pipeline.isActive).toBe(true)
    expect(pipeline.createdAt).toBeInstanceOf(Date)
    expect(pipeline.updatedAt).toBeInstanceOf(Date)
  })

  it('deactivate() sets isActive to false', () => {
    const pipeline = Pipeline.create({ tenantId: 'tenant-1', name: 'Sales' })
    pipeline.deactivate()
    expect(pipeline.isActive).toBe(false)
  })

  it('rename() updates name', () => {
    const pipeline = Pipeline.create({ tenantId: 'tenant-1', name: 'Sales' })
    pipeline.rename('New Sales Pipeline')
    expect(pipeline.name).toBe('New Sales Pipeline')
  })

  it('reconstitute() restores all fields', () => {
    const id = new UniqueEntityID('pipeline-abc')
    const createdAt = new Date('2024-01-01')
    const updatedAt = new Date('2024-06-01')

    const pipeline = Pipeline.reconstitute(
      { tenantId: 'tenant-1', name: 'Support', isActive: false, createdAt, updatedAt },
      id,
    )

    expect(pipeline.id.toString()).toBe('pipeline-abc')
    expect(pipeline.tenantId).toBe('tenant-1')
    expect(pipeline.name).toBe('Support')
    expect(pipeline.isActive).toBe(false)
    expect(pipeline.createdAt).toBe(createdAt)
    expect(pipeline.updatedAt).toBe(updatedAt)
  })
})
