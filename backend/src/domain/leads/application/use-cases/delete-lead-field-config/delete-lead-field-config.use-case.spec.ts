import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteLeadFieldConfigUseCase } from './delete-lead-field-config.use-case'
import { InMemoryLeadFieldConfigRepository } from '@/test/repositories/in-memory-lead-field-config.repository'
import { makeLeadFieldConfig } from '@/test/factories/make-lead-field-config'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'

describe('DeleteLeadFieldConfigUseCase', () => {
  let sut: DeleteLeadFieldConfigUseCase
  let repo: InMemoryLeadFieldConfigRepository

  beforeEach(() => {
    repo = new InMemoryLeadFieldConfigRepository()
    sut = new DeleteLeadFieldConfigUseCase(repo)
  })

  it('deletes a non-builtin field config', async () => {
    const config = makeLeadFieldConfig({ tenantId: TENANT_ID, isBuiltin: false }, new UniqueEntityID('cfg-1'))
    repo.items.push(config)

    const result = await sut.execute({ configId: 'cfg-1', tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
  })

  it('returns error when trying to delete a builtin field', async () => {
    const config = makeLeadFieldConfig({ tenantId: TENANT_ID, isBuiltin: true }, new UniqueEntityID('cfg-1'))
    repo.items.push(config)

    const result = await sut.execute({ configId: 'cfg-1', tenantId: TENANT_ID })

    expect(result.isLeft()).toBe(true)
    expect(repo.items).toHaveLength(1)
  })

  it('returns error when config not found', async () => {
    const result = await sut.execute({ configId: 'non-existent', tenantId: TENANT_ID })

    expect(result.isLeft()).toBe(true)
  })
})
