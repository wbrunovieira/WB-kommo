import { describe, it, expect, beforeEach } from 'vitest'
import { RegisterUserUseCase } from './register-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { UserAlreadyExistsError } from '../errors/user-already-exists.error'

describe('RegisterUserUseCase', () => {
  let sut: RegisterUserUseCase
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    sut = new RegisterUserUseCase(identityRepo, profileRepo, authorizationRepo)
  })

  it('should register a new user successfully', async () => {
    const result = await sut.execute({
      tenantId: 'tenant-1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'MEMBER',
    })

    expect(result.isRight()).toBe(true)
    expect(identityRepo.items).toHaveLength(1)
    expect(profileRepo.items).toHaveLength(1)
    expect(authorizationRepo.items).toHaveLength(1)
    expect(identityRepo.items[0].email.value).toBe('john@example.com')
    expect(profileRepo.items[0].name).toBe('John Doe')
    expect(authorizationRepo.items[0].role.value).toBe('MEMBER')
  })

  it('should return UserAlreadyExistsError when email is taken in same tenant', async () => {
    await sut.execute({
      tenantId: 'tenant-1',
      name: 'John',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'MEMBER',
    })

    const result = await sut.execute({
      tenantId: 'tenant-1',
      name: 'John Duplicate',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
    expect(identityRepo.items).toHaveLength(1)
  })

  it('should allow same email in different tenants', async () => {
    await sut.execute({
      tenantId: 'tenant-1',
      name: 'John',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'MEMBER',
    })

    const result = await sut.execute({
      tenantId: 'tenant-2',
      name: 'John Other Tenant',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    expect(identityRepo.items).toHaveLength(2)
  })

  it('should return Left when password is weak', async () => {
    const result = await sut.execute({
      tenantId: 'tenant-1',
      name: 'John',
      email: 'john@example.com',
      password: 'weak',
      role: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(identityRepo.items).toHaveLength(0)
  })

  it('should return Left when email is invalid', async () => {
    const result = await sut.execute({
      tenantId: 'tenant-1',
      name: 'John',
      email: 'not-an-email',
      password: 'Fixture#1a',
      role: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(identityRepo.items).toHaveLength(0)
  })

  it('should store identity id in profile and authorization', async () => {
    await sut.execute({
      tenantId: 'tenant-1',
      name: 'John',
      email: 'john@example.com',
      password: 'Fixture#1a',
      role: 'ACCOUNT_ADMIN',
    })

    const identity = identityRepo.items[0]
    expect(profileRepo.items[0].identityId).toBe(identity.id.toString())
    expect(authorizationRepo.items[0].identityId).toBe(identity.id.toString())
  })
})
