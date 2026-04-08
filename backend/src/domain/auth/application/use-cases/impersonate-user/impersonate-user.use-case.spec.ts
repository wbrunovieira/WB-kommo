import { describe, it, expect, beforeEach } from 'vitest'
import { ImpersonateUserUseCase } from './impersonate-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { InMemoryUserSessionRepository } from '@/test/repositories/in-memory-user-session.repository'
import { InMemoryTenantRepository } from '@/test/repositories/in-memory-tenant.repository'
import { makeUserIdentitySync } from '@/test/factories/make-user-identity'
import { makeUserAuthorization } from '@/test/factories/make-user-authorization'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UnauthorizedError } from '../errors/unauthorized.error'

const RESELLER_TENANT = 'reseller-tenant'
const CLIENT_TENANT   = 'client-tenant'
const OTHER_TENANT    = 'other-tenant'

function setupReseller(
  identityRepo: InMemoryUserIdentityRepository,
  authRepo: InMemoryUserAuthorizationRepository,
  tenantRepo: InMemoryTenantRepository,
) {
  const id = new UniqueEntityID('reseller-id')
  const identity = makeUserIdentitySync({}, id)
  const auth = makeUserAuthorization({ identityId: id.toString(), tenantId: RESELLER_TENANT, role: 'RESELLER' })
  identityRepo.items.push(identity)
  authRepo.items.push(auth)
  // Register the client tenant as owned by this reseller
  tenantRepo.items.push({
    id: CLIENT_TENANT,
    name: 'Client Corp',
    slug: 'client-corp',
    isActive: true,
    resellerTenantId: RESELLER_TENANT,
  })
  return { id }
}

function setupPlatformOwner(
  authRepo: InMemoryUserAuthorizationRepository,
  tenantRepo: InMemoryTenantRepository,
) {
  const id = new UniqueEntityID('owner-id')
  const auth = makeUserAuthorization({ identityId: id.toString(), tenantId: 'platform-tenant', role: 'PLATFORM_OWNER' })
  authRepo.items.push(auth)
  // Any tenant exists in the repo
  tenantRepo.items.push({
    id: OTHER_TENANT,
    name: 'Some Corp',
    slug: 'some-corp',
    isActive: true,
    resellerTenantId: 'another-reseller',
  })
  return { id }
}

describe('ImpersonateUserUseCase', () => {
  let sut: ImpersonateUserUseCase
  let identityRepo: InMemoryUserIdentityRepository
  let authRepo: InMemoryUserAuthorizationRepository
  let sessionRepo: InMemoryUserSessionRepository
  let tenantRepo: InMemoryTenantRepository

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    authRepo = new InMemoryUserAuthorizationRepository()
    sessionRepo = new InMemoryUserSessionRepository()
    tenantRepo = new InMemoryTenantRepository()
    sut = new ImpersonateUserUseCase(authRepo, sessionRepo, tenantRepo)
  })

  describe('RESELLER impersonation', () => {
    it('should create impersonation session when target tenant belongs to reseller', async () => {
      setupReseller(identityRepo, authRepo, tenantRepo)

      const result = await sut.execute({
        resellerId: 'reseller-id',
        targetTenantId: CLIENT_TENANT,
      })

      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value).toHaveProperty('accessToken')
      }
      expect(sessionRepo.items).toHaveLength(1)
      expect(sessionRepo.items[0].isImpersonation).toBe(true)
      expect(sessionRepo.items[0].impersonatorId).toBe('reseller-id')
    })

    it('should return UnauthorizedError when target tenant does NOT belong to reseller', async () => {
      setupReseller(identityRepo, authRepo, tenantRepo)

      const result = await sut.execute({
        resellerId: 'reseller-id',
        targetTenantId: OTHER_TENANT,
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBeInstanceOf(UnauthorizedError)
      expect(sessionRepo.items).toHaveLength(0)
    })
  })

  describe('PLATFORM_OWNER impersonation', () => {
    it('should create impersonation session for any tenant (bypasses ownership check)', async () => {
      setupPlatformOwner(authRepo, tenantRepo)

      const result = await sut.execute({
        resellerId: 'owner-id',
        targetTenantId: OTHER_TENANT,
      })

      expect(result.isRight()).toBe(true)
      expect(sessionRepo.items).toHaveLength(1)
      expect(sessionRepo.items[0].isImpersonation).toBe(true)
    })
  })

  it('should return UnauthorizedError when actor is not RESELLER or PLATFORM_OWNER', async () => {
    const id = new UniqueEntityID('admin-id')
    const auth = makeUserAuthorization({ identityId: id.toString(), role: 'ACCOUNT_ADMIN' })
    authRepo.items.push(auth)

    const result = await sut.execute({
      resellerId: 'admin-id',
      targetTenantId: CLIENT_TENANT,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
    expect(sessionRepo.items).toHaveLength(0)
  })

  it('should return UnauthorizedError when actor not found', async () => {
    const result = await sut.execute({
      resellerId: 'ghost-id',
      targetTenantId: CLIENT_TENANT,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })
})
