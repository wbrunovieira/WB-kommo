import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaUserIdentityRepository } from '@/infra/database/prisma/repositories/prisma-user-identity.repository'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { makeUserIdentitySync } from '@/test/factories/make-user-identity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

// Helpers — seed required parent records
async function seedPlanAndTenant(prisma: PrismaClient, tenantId: string) {
  const plan = await prisma.plan.create({
    data: { id: 'plan-1', name: 'Starter', maxUsers: 10, maxLeads: 100, price: 0 },
  })
  await prisma.tenant.create({
    data: { id: tenantId, name: 'Test Tenant', slug: tenantId, planId: plan.id },
  })
}

describe('PrismaUserIdentityRepository (integration)', () => {
  let prismaService: PrismaService
  let repo: PrismaUserIdentityRepository
  const TENANT_ID = 'tenant-integration-1'

  beforeAll(async () => {
    prismaService = new PrismaService()
    await prismaService.$connect()
    repo = new PrismaUserIdentityRepository(prismaService)
    await seedPlanAndTenant(prismaService as unknown as PrismaClient, TENANT_ID)
  })

  afterAll(async () => {
    await prismaService.$disconnect()
  })

  afterEach(async () => {
    // Clean only user_identities, keep plan/tenant
    await prismaService.userIdentity.deleteMany({ where: { tenantId: TENANT_ID } })
  })

  describe('save + findById', () => {
    it('persists and retrieves an identity by id', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'alice@test.com' })

      const saveResult = await repo.save(identity)
      expect(saveResult.isRight()).toBe(true)

      const findResult = await repo.findById(identity.id)
      expect(findResult.isRight()).toBe(true)
      expect(findResult.value).not.toBeNull()
      expect(findResult.value?.email.value).toBe('alice@test.com')
    })

    it('returns null for a non-existent id', async () => {
      const result = await repo.findById(new UniqueEntityID('non-existent'))
      expect(result.isRight()).toBe(true)
      expect(result.value).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('finds identity by tenantId + email', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'bob@test.com' })
      await repo.save(identity)

      const result = await repo.findByEmail(TENANT_ID, Email.createTrusted('bob@test.com'))
      expect(result.isRight()).toBe(true)
      expect(result.value?.id.toString()).toBe(identity.id.toString())
    })

    it('does NOT find soft-deleted identity', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'deleted@test.com' })
      identity.softDelete()
      await repo.save(identity)

      const result = await repo.findByEmail(TENANT_ID, Email.createTrusted('deleted@test.com'))
      expect(result.isRight()).toBe(true)
      expect(result.value).toBeNull()
    })

    it('does NOT find identity from a different tenant', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'cross@test.com' })
      await repo.save(identity)

      const result = await repo.findByEmail('other-tenant', Email.createTrusted('cross@test.com'))
      expect(result.isRight()).toBe(true)
      expect(result.value).toBeNull()
    })
  })

  describe('emailExists', () => {
    it('returns true when email is registered', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'exists@test.com' })
      await repo.save(identity)

      const result = await repo.emailExists(TENANT_ID, Email.createTrusted('exists@test.com'))
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(true)
    })

    it('returns false when email is not registered', async () => {
      const result = await repo.emailExists(TENANT_ID, Email.createTrusted('ghost@test.com'))
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(false)
    })
  })

  describe('upsert (save existing)', () => {
    it('updates identity data on second save (upsert)', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'upsert@test.com' })
      await repo.save(identity)

      identity.incrementFailedAttempts()
      identity.incrementFailedAttempts()
      await repo.save(identity)

      const result = await repo.findById(identity.id)
      expect(result.value?.failedLoginAttempts).toBe(2)
    })
  })

  describe('lock state persistence', () => {
    it('persists locked account state', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'lockme@test.com' })
      identity.lockAccount(15)
      await repo.save(identity)

      const result = await repo.findById(identity.id)
      expect(result.value?.isLocked()).toBe(true)
    })
  })

  describe('soft delete', () => {
    it('marks identity as deleted and anonymizes email', async () => {
      const identity = makeUserIdentitySync({ tenantId: TENANT_ID, email: 'todelete@test.com' })
      await repo.save(identity)

      identity.softDelete()
      await repo.save(identity)

      const raw = await prismaService.userIdentity.findFirst({
        where: { id: identity.id.toString() },
      })
      expect(raw?.deletedAt).not.toBeNull()
      expect(raw?.email).toContain('@deleted.invalid')
    })
  })
})
