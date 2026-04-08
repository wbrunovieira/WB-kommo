import { describe, it, expect, beforeEach } from 'vitest'
import { ListTenantsUseCase } from './list-tenants.use-case'
import { InMemoryTenantRepository } from '@/test/repositories/in-memory-tenant.repository'

const RESELLER_TENANT = 'reseller-tenant'

function seed(repo: InMemoryTenantRepository) {
  repo.items.push(
    { id: RESELLER_TENANT,  name: 'My Agency',   slug: 'my-agency',   isActive: true, resellerTenantId: null },
    { id: 'client-1',       name: 'Client One',  slug: 'client-one',  isActive: true, resellerTenantId: RESELLER_TENANT },
    { id: 'client-2',       name: 'Client Two',  slug: 'client-two',  isActive: true, resellerTenantId: RESELLER_TENANT },
    { id: 'other-reseller', name: 'Other Agency',slug: 'other-agency',isActive: true, resellerTenantId: null },
    { id: 'other-client',   name: 'Other Client',slug: 'other-client',isActive: true, resellerTenantId: 'other-reseller' },
  )
}

describe('ListTenantsUseCase', () => {
  let sut: ListTenantsUseCase
  let repo: InMemoryTenantRepository

  beforeEach(() => {
    repo = new InMemoryTenantRepository()
    sut = new ListTenantsUseCase(repo)
    seed(repo)
  })

  describe('RESELLER', () => {
    it('returns only tenants that belong to the calling reseller', async () => {
      const result = await sut.execute({ actorRole: 'RESELLER', actorTenantId: RESELLER_TENANT })

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) return
      expect(result.value).toHaveLength(2)
      expect(result.value.map((t) => t.id)).toEqual(
        expect.arrayContaining(['client-1', 'client-2']),
      )
    })

    it('returns empty list when reseller has no clients', async () => {
      const result = await sut.execute({ actorRole: 'RESELLER', actorTenantId: 'unknown-reseller' })

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) return
      expect(result.value).toHaveLength(0)
    })
  })

  describe('PLATFORM_OWNER', () => {
    it('returns all tenants', async () => {
      const result = await sut.execute({ actorRole: 'PLATFORM_OWNER', actorTenantId: 'platform-tenant' })

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) return
      expect(result.value.length).toBe(5)
    })
  })
})
