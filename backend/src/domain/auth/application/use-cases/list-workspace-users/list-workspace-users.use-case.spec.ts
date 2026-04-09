import { describe, it, expect, beforeEach } from 'vitest'
import { ListWorkspaceUsersUseCase } from './list-workspace-users.use-case'
import { InMemoryUserAggregatedViewRepository } from '@/test/repositories/in-memory-user-aggregated-view.repository'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { RegisterUserUseCase } from '../register-user/register-user.use-case'
import { UnauthorizedError } from '../errors/unauthorized.error'

async function seedUser(
  register: RegisterUserUseCase,
  opts: { tenantId: string; email: string; role: string },
) {
  await register.execute({
    tenantId: opts.tenantId,
    name: 'Test User',
    email: opts.email,
    password: 'Fixture#1a',
    role: opts.role as any,
  })
}

describe('ListWorkspaceUsersUseCase', () => {
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository
  let aggregatedViewRepo: InMemoryUserAggregatedViewRepository
  let registerUseCase: RegisterUserUseCase
  let sut: ListWorkspaceUsersUseCase

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    aggregatedViewRepo = new InMemoryUserAggregatedViewRepository(
      identityRepo,
      profileRepo,
      authorizationRepo,
    )
    registerUseCase = new RegisterUserUseCase(identityRepo, profileRepo, authorizationRepo)
    sut = new ListWorkspaceUsersUseCase(aggregatedViewRepo)
  })

  it('should list users in the same tenant for MEMBER', async () => {
    await seedUser(registerUseCase, { tenantId: 'tenant-1', email: 'a@test.com', role: 'MEMBER' })
    await seedUser(registerUseCase, { tenantId: 'tenant-1', email: 'b@test.com', role: 'AGENT' })

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetTenantId: 'tenant-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toHaveLength(2)
  })

  it('should return UnauthorizedError for AGENT', async () => {
    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'AGENT',
      targetTenantId: 'tenant-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('should not allow MEMBER to list another tenant', async () => {
    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetTenantId: 'tenant-2',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('should allow PLATFORM_OWNER to list any tenant', async () => {
    await seedUser(registerUseCase, { tenantId: 'tenant-2', email: 'c@test.com', role: 'AGENT' })

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'PLATFORM_OWNER',
      targetTenantId: 'tenant-2',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toHaveLength(1)
  })

  it('should only return users in the target tenant', async () => {
    await seedUser(registerUseCase, { tenantId: 'tenant-1', email: 'a@test.com', role: 'MEMBER' })
    await seedUser(registerUseCase, { tenantId: 'tenant-2', email: 'b@test.com', role: 'MEMBER' })

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetTenantId: 'tenant-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toHaveLength(1)
  })
})
