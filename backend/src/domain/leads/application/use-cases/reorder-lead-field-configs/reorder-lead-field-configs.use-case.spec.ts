import { describe, it, expect, beforeEach } from 'vitest'
import { ReorderLeadFieldConfigsUseCase } from './reorder-lead-field-configs.use-case'
import { InMemoryLeadFieldConfigRepository } from '@/test/repositories/in-memory-lead-field-config.repository'
import { makeLeadFieldConfig } from '@/test/factories/make-lead-field-config'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'

describe('ReorderLeadFieldConfigsUseCase', () => {
  let sut: ReorderLeadFieldConfigsUseCase
  let repo: InMemoryLeadFieldConfigRepository

  beforeEach(() => {
    repo = new InMemoryLeadFieldConfigRepository()
    sut = new ReorderLeadFieldConfigsUseCase(repo)
  })

  it('updates order for each config', async () => {
    const cfg1 = makeLeadFieldConfig({ tenantId: TENANT_ID, order: 0 }, new UniqueEntityID('cfg-1'))
    const cfg2 = makeLeadFieldConfig({ tenantId: TENANT_ID, order: 1 }, new UniqueEntityID('cfg-2'))
    repo.items.push(cfg1, cfg2)

    const result = await sut.execute({
      tenantId: TENANT_ID,
      order: [
        { configId: 'cfg-1', order: 1 },
        { configId: 'cfg-2', order: 0 },
      ],
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items.find(c => c.id.toString() === 'cfg-1')!.order).toBe(1)
    expect(repo.items.find(c => c.id.toString() === 'cfg-2')!.order).toBe(0)
  })
})
