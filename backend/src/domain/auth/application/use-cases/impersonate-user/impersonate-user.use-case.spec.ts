import { describe, it, expect, beforeEach } from 'vitest'
import { ImpersonateUserUseCase } from './impersonate-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { InMemoryUserSessionRepository } from '@/test/repositories/in-memory-user-session.repository'
import { makeUserIdentitySync } from '@/test/factories/make-user-identity'
import { makeUserAuthorization } from '@/test/factories/make-user-authorization'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UnauthorizedError } from '../errors/unauthorized.error'

function setupReseller(identityRepo: InMemoryUserIdentityRepository, authRepo: InMemoryUserAuthorizationRepository) {
  const id = new UniqueEntityID('reseller-id')
  const identity = makeUserIdentitySync({}, id)
  const auth = makeUserAuthorization({ identityId: id.toString(), tenantId: 'reseller-tenant', role: 'RESELLER' })
  identityRepo.items.push(identity)
  authRepo.items.push(auth)
  return { id }
}

describe('ImpersonateUserUseCase', () => {
  let sut: ImpersonateUserUseCase
  let identityRepo: InMemoryUserIdentityRepository
  let authRepo: InMemoryUserAuthorizationRepository
  let sessionRepo: InMemoryUserSessionRepository

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    authRepo = new InMemoryUserAuthorizationRepository()
    sessionRepo = new InMemoryUserSessionRepository()
    sut = new ImpersonateUserUseCase(authRepo, sessionRepo)
  })

  it('should create impersonation session for RESELLER', async () => {
    setupReseller(identityRepo, authRepo)

    const result = await sut.execute({
      resellerId: 'reseller-id',
      targetTenantId: 'target-tenant',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value).toHaveProperty('accessToken')
    }
    expect(sessionRepo.items).toHaveLength(1)
    expect(sessionRepo.items[0].isImpersonation).toBe(true)
    expect(sessionRepo.items[0].impersonatorId).toBe('reseller-id')
  })

  it('should return UnauthorizedError when actor is not RESELLER', async () => {
    const id = new UniqueEntityID('admin-id')
    const auth = makeUserAuthorization({ identityId: id.toString(), role: 'ACCOUNT_ADMIN' })
    authRepo.items.push(auth)

    const result = await sut.execute({
      resellerId: 'admin-id',
      targetTenantId: 'target-tenant',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
    expect(sessionRepo.items).toHaveLength(0)
  })

  it('should return UnauthorizedError when reseller not found', async () => {
    const result = await sut.execute({
      resellerId: 'ghost-id',
      targetTenantId: 'target-tenant',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })
})
