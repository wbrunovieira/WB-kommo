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
})
