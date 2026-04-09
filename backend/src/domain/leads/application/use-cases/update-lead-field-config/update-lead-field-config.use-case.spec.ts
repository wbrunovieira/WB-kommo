import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateLeadFieldConfigUseCase } from './update-lead-field-config.use-case'
import { InMemoryLeadFieldConfigRepository } from '@/test/repositories/in-memory-lead-field-config.repository'
import { makeLeadFieldConfig } from '@/test/factories/make-lead-field-config'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'

describe('UpdateLeadFieldConfigUseCase', () => {
  let sut: UpdateLeadFieldConfigUseCase
  let repo: InMemoryLeadFieldConfigRepository

  beforeEach(() => {
    repo = new InMemoryLeadFieldConfigRepository()
    sut = new UpdateLeadFieldConfigUseCase(repo)
  })

  it('updates label and isActive of an existing config', async () => {
    const config = makeLeadFieldConfig({ tenantId: TENANT_ID, label: 'Old Label', isActive: true }, new UniqueEntityID('cfg-1'))
    repo.items.push(config)

    const result = await sut.execute({
      configId: 'cfg-1',
      tenantId: TENANT_ID,
      updates: { label: 'New Label', isActive: false },
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].label).toBe('New Label')
    expect(repo.items[0].isActive).toBe(false)
  })

  it('returns error when config not found', async () => {
    const result = await sut.execute({
      configId: 'non-existent',
      tenantId: TENANT_ID,
      updates: { label: 'New Label' },
    })

    expect(result.isLeft()).toBe(true)
  })
})
