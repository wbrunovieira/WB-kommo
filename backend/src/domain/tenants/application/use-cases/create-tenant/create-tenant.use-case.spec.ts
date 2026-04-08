import { describe, it, expect, beforeEach } from 'vitest'
import { CreateTenantUseCase } from './create-tenant.use-case'
import { InMemoryTenantRepository } from '@/test/repositories/in-memory-tenant.repository'
import { TenantSlugTakenError } from '../errors/tenant-slug-taken.error'

describe('CreateTenantUseCase', () => {
  let sut: CreateTenantUseCase
  let tenantRepo: InMemoryTenantRepository

  beforeEach(() => {
    tenantRepo = new InMemoryTenantRepository()
    sut = new CreateTenantUseCase(tenantRepo)
  })

  it('should create a client tenant for a reseller', async () => {
    const result = await sut.execute({
      name: 'Acme Corp',
      slug: 'acme-corp',
      planId: 'plan-1',
      resellerTenantId: 'reseller-tenant-id',
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.id).toBeDefined()
    expect(result.value.name).toBe('Acme Corp')
    expect(result.value.slug).toBe('acme-corp')
    expect(result.value.resellerTenantId).toBe('reseller-tenant-id')
    expect(tenantRepo.savedTenants).toHaveLength(1)
  })

  it('should create a reseller tenant for PLATFORM_OWNER (resellerTenantId = null)', async () => {
    const result = await sut.execute({
      name: 'New Reseller',
      slug: 'new-reseller',
      planId: 'plan-1',
      resellerTenantId: null,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.resellerTenantId).toBeNull()
  })

  it('should return TenantSlugTakenError when slug is already taken', async () => {
    tenantRepo.items.push({
      id: 'existing-id',
      name: 'Existing Corp',
      slug: 'taken-slug',
      isActive: true,
      resellerTenantId: null,
    })

    const result = await sut.execute({
      name: 'Another Corp',
      slug: 'taken-slug',
      planId: 'plan-1',
      resellerTenantId: 'reseller-id',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(TenantSlugTakenError)
    expect(tenantRepo.savedTenants).toHaveLength(0)
  })
})
