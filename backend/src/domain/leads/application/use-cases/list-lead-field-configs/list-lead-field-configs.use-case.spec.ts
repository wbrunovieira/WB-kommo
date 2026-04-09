import { describe, it, expect, beforeEach } from 'vitest'
import { ListLeadFieldConfigsUseCase } from './list-lead-field-configs.use-case'
import { InMemoryLeadFieldConfigRepository } from '@/test/repositories/in-memory-lead-field-config.repository'
import { makeLeadFieldConfig } from '@/test/factories/make-lead-field-config'

const TENANT_ID = 'tenant-1'

describe('ListLeadFieldConfigsUseCase', () => {
  let sut: ListLeadFieldConfigsUseCase
  let repo: InMemoryLeadFieldConfigRepository

  beforeEach(() => {
    repo = new InMemoryLeadFieldConfigRepository()
    sut = new ListLeadFieldConfigsUseCase(repo)
  })

  it('returns existing configs for tenant sorted by order', async () => {
    repo.items.push(makeLeadFieldConfig({ tenantId: TENANT_ID, key: 'phone', order: 2 }))
    repo.items.push(makeLeadFieldConfig({ tenantId: TENANT_ID, key: 'email', order: 1 }))

    const result = await sut.execute({ tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.configs).toHaveLength(2)
    expect(result.value.configs[0].key).toBe('email')
  })

  it('seeds default configs when none exist for tenant', async () => {
    const result = await sut.execute({ tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.configs.length).toBeGreaterThan(0)
    const keys = result.value.configs.map(c => c.key)
    expect(keys).toContain('value')
    expect(keys).toContain('email')
    expect(keys).toContain('phone')
    // Seeded configs should be persisted
    expect(repo.items.filter(c => c.tenantId === TENANT_ID).length).toBeGreaterThan(0)
  })

  it('does not return configs from other tenants', async () => {
    repo.items.push(makeLeadFieldConfig({ tenantId: 'other-tenant', key: 'email' }))

    const result = await sut.execute({ tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    const otherTenantConfigs = result.value.configs.filter(c => c.tenantId === 'other-tenant')
    expect(otherTenantConfigs).toHaveLength(0)
  })
})
