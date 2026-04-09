import { describe, it, expect, beforeEach } from 'vitest'
import { CreateLeadFieldConfigUseCase } from './create-lead-field-config.use-case'
import { InMemoryLeadFieldConfigRepository } from '@/test/repositories/in-memory-lead-field-config.repository'

const TENANT_ID = 'tenant-1'

describe('CreateLeadFieldConfigUseCase', () => {
  let sut: CreateLeadFieldConfigUseCase
  let repo: InMemoryLeadFieldConfigRepository

  beforeEach(() => {
    repo = new InMemoryLeadFieldConfigRepository()
    sut = new CreateLeadFieldConfigUseCase(repo)
  })

  it('creates a new custom field config', async () => {
    const result = await sut.execute({
      tenantId: TENANT_ID,
      label: 'Budget',
      type: 'NUMBER',
      isRequired: false,
      options: [],
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].label).toBe('Budget')
    expect(repo.items[0].isBuiltin).toBe(false)
  })

  it('generates a unique key for the custom field', async () => {
    const result = await sut.execute({
      tenantId: TENANT_ID,
      label: 'My Field',
      type: 'TEXT',
      isRequired: false,
      options: [],
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.config.key).toMatch(/^custom_/)
  })

  it('assigns order based on existing configs count', async () => {
    await sut.execute({ tenantId: TENANT_ID, label: 'A', type: 'TEXT', isRequired: false, options: [] })
    await sut.execute({ tenantId: TENANT_ID, label: 'B', type: 'TEXT', isRequired: false, options: [] })

    expect(repo.items[0].order).toBe(0)
    expect(repo.items[1].order).toBe(1)
  })
})
