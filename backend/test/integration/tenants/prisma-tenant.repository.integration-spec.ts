import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaTenantRepository } from '@/infra/database/prisma/repositories/prisma-tenant.repository'

async function seedPlan(prisma: PrismaClient) {
  return prisma.plan.upsert({
    where: { id: 'plan-test-tenant' },
    update: {},
    create: { id: 'plan-test-tenant', name: 'Test', maxUsers: 5, maxLeads: 50, price: 0, features: {} },
  })
}

describe('PrismaTenantRepository (integration)', () => {
  let prismaService: PrismaService
  let repo: PrismaTenantRepository

  beforeAll(async () => {
    prismaService = new PrismaService()
    await prismaService.$connect()
    repo = new PrismaTenantRepository(prismaService)
    await seedPlan(prismaService as unknown as PrismaClient)
  })

  afterAll(async () => {
    await prismaService.$disconnect()
  })

  afterEach(async () => {
    await prismaService.tenant.deleteMany({ where: { planId: 'plan-test-tenant' } })
  })

  describe('findBySlug', () => {
    it('returns the tenant when slug exists', async () => {
      await prismaService.tenant.create({
        data: { id: 'tid-1', name: 'Acme', slug: 'acme-corp', planId: 'plan-test-tenant', isActive: true },
      })

      const result = await repo.findBySlug('acme-corp')

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value).not.toBeNull()
      expect(result.value!.id).toBe('tid-1')
      expect(result.value!.isActive).toBe(true)
    })

    it('returns null when slug does not exist', async () => {
      const result = await repo.findBySlug('non-existent-workspace')

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value).toBeNull()
    })

    it('returns inactive tenant (caller decides to reject)', async () => {
      await prismaService.tenant.create({
        data: { id: 'tid-2', name: 'Old Corp', slug: 'old-corp', planId: 'plan-test-tenant', isActive: false },
      })

      const result = await repo.findBySlug('old-corp')

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value!.isActive).toBe(false)
    })
  })

  describe('findClientsByReseller', () => {
    it('returns only tenants that belong to the given reseller', async () => {
      await prismaService.tenant.create({
        data: { id: 'reseller-1', name: 'Reseller One', slug: 'reseller-one', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })
      await prismaService.tenant.create({
        data: { id: 'client-1', name: 'Client One', slug: 'client-one', planId: 'plan-test-tenant', isActive: true, resellerTenantId: 'reseller-1' },
      })
      await prismaService.tenant.create({
        data: { id: 'other-reseller', name: 'Other Reseller', slug: 'other-reseller', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })

      const result = await repo.findClientsByReseller('reseller-1')

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value).toHaveLength(1)
      expect(result.value[0].id).toBe('client-1')
    })

    it('returns empty array when reseller has no clients', async () => {
      await prismaService.tenant.create({
        data: { id: 'lonely-reseller', name: 'Lonely', slug: 'lonely', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })

      const result = await repo.findClientsByReseller('lonely-reseller')

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value).toHaveLength(0)
    })
  })

  describe('findAll', () => {
    it('returns every tenant regardless of resellerTenantId', async () => {
      await prismaService.tenant.create({
        data: { id: 'fa-res', name: 'Reseller FA', slug: 'reseller-fa', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })
      await prismaService.tenant.create({
        data: { id: 'fa-cli', name: 'Client FA', slug: 'client-fa', planId: 'plan-test-tenant', isActive: true, resellerTenantId: 'fa-res' },
      })

      const result = await repo.findAll()

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('findAllResellers', () => {
    it('returns only tenants with resellerTenantId = null', async () => {
      await prismaService.tenant.create({
        data: { id: 'res-a', name: 'Reseller A', slug: 'reseller-a', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })
      await prismaService.tenant.create({
        data: { id: 'res-b', name: 'Reseller B', slug: 'reseller-b', planId: 'plan-test-tenant', isActive: true, resellerTenantId: null },
      })
      await prismaService.tenant.create({
        data: { id: 'client-of-a', name: 'Client of A', slug: 'client-a', planId: 'plan-test-tenant', isActive: true, resellerTenantId: 'res-a' },
      })

      const result = await repo.findAllResellers()

      expect(result.isRight()).toBe(true)
      if (!result.isRight()) throw new Error('expected right')
      expect(result.value.length).toBeGreaterThanOrEqual(2)
      expect(result.value.every((t) => t.resellerTenantId === null)).toBe(true)
    })
  })
})
