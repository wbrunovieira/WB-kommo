import { describe, it, expect, beforeEach } from 'vitest'
import { AuthenticateUserUseCase } from './authenticate-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { InMemoryUserSessionRepository } from '@/test/repositories/in-memory-user-session.repository'
import { InMemoryUserAggregatedViewRepository } from '@/test/repositories/in-memory-user-aggregated-view.repository'
import { makeUserIdentitySync } from '@/test/factories/make-user-identity'
import { makeUserProfile } from '@/test/factories/make-user-profile'
import { makeUserAuthorization } from '@/test/factories/make-user-authorization'
import { Password } from '@/domain/auth/enterprise/value-objects/password.vo'
import { InvalidCredentialsError } from '../errors/invalid-credentials.error'
import { AccountLockedError } from '../errors/account-locked.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

async function setupUser(deps: {
  identityRepo: InMemoryUserIdentityRepository
  profileRepo: InMemoryUserProfileRepository
  authRepo: InMemoryUserAuthorizationRepository
}, overrides: { email?: string; locked?: boolean } = {}) {
  const id = new UniqueEntityID()
  const password = await Password.create('P@ssw0rd!')
  const identity = makeUserIdentitySync(
    {
      email: overrides.email ?? 'user@example.com',
      passwordHash: password.value,
      isEmailVerified: true,
      lockedUntil: overrides.locked ? new Date(Date.now() + 60000) : undefined,
    },
    id,
  )
  const profile = makeUserProfile({ identityId: id.toString() })
  const auth = makeUserAuthorization({ identityId: id.toString(), role: 'MEMBER' })

  deps.identityRepo.items.push(identity)
  deps.profileRepo.items.push(profile)
  deps.authRepo.items.push(auth)
  return { identity, profile, auth }
}

describe('AuthenticateUserUseCase', () => {
  let sut: AuthenticateUserUseCase
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository
  let authRepo: InMemoryUserAuthorizationRepository
  let sessionRepo: InMemoryUserSessionRepository
  let viewRepo: InMemoryUserAggregatedViewRepository

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    authRepo = new InMemoryUserAuthorizationRepository()
    sessionRepo = new InMemoryUserSessionRepository()
    viewRepo = new InMemoryUserAggregatedViewRepository(identityRepo, profileRepo, authRepo)
    sut = new AuthenticateUserUseCase(viewRepo, identityRepo, sessionRepo)
  })

  it('should authenticate with valid credentials', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo })

    const result = await sut.execute({
      tenantId: 'tenant-1',
      email: 'user@example.com',
      password: 'P@ssw0rd!',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value).toHaveProperty('accessToken')
      expect(result.value).toHaveProperty('refreshToken')
    }
  })

  it('should create a UserSession on success', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo })

    await sut.execute({ tenantId: 'tenant-1', email: 'user@example.com', password: 'P@ssw0rd!' })

    expect(sessionRepo.items).toHaveLength(1)
    expect(sessionRepo.items[0].isValid()).toBe(true)
  })

  it('should return InvalidCredentialsError for wrong password', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo })

    const result = await sut.execute({
      tenantId: 'tenant-1',
      email: 'user@example.com',
      password: 'WrongPass1!',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })

  it('should return InvalidCredentialsError for unknown email', async () => {
    const result = await sut.execute({
      tenantId: 'tenant-1',
      email: 'ghost@example.com',
      password: 'P@ssw0rd!',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })

  it('should increment failedLoginAttempts on wrong password', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo })

    await sut.execute({ tenantId: 'tenant-1', email: 'user@example.com', password: 'WrongPass1!' })

    expect(identityRepo.items[0].failedLoginAttempts).toBe(1)
  })

  it('should reset failedLoginAttempts on successful login', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo })

    await sut.execute({ tenantId: 'tenant-1', email: 'user@example.com', password: 'WrongPass1!' })
    await sut.execute({ tenantId: 'tenant-1', email: 'user@example.com', password: 'P@ssw0rd!' })

    expect(identityRepo.items[0].failedLoginAttempts).toBe(0)
  })

  it('should return AccountLockedError when account is locked', async () => {
    await setupUser({ identityRepo, profileRepo, authRepo }, { locked: true })

    const result = await sut.execute({
      tenantId: 'tenant-1',
      email: 'user@example.com',
      password: 'P@ssw0rd!',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(AccountLockedError)
  })

  it('should return InvalidCredentialsError for invalid email format', async () => {
    const result = await sut.execute({
      tenantId: 'tenant-1',
      email: 'not-an-email',
      password: 'P@ssw0rd!',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })
})
