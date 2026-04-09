import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateWorkspaceUserUseCase } from './update-workspace-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { InMemoryUserAggregatedViewRepository } from '@/test/repositories/in-memory-user-aggregated-view.repository'
import { RegisterUserUseCase } from '../register-user/register-user.use-case'
import { UnauthorizedError } from '../errors/unauthorized.error'

describe('UpdateWorkspaceUserUseCase', () => {
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository
  let aggregatedViewRepo: InMemoryUserAggregatedViewRepository
  let register: RegisterUserUseCase
  let sut: UpdateWorkspaceUserUseCase

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    aggregatedViewRepo = new InMemoryUserAggregatedViewRepository(identityRepo, profileRepo, authorizationRepo)
    register = new RegisterUserUseCase(identityRepo, profileRepo, authorizationRepo)
    sut = new UpdateWorkspaceUserUseCase(identityRepo, profileRepo, authorizationRepo, aggregatedViewRepo)
  })

  async function createUser(tenantId: string, email: string, role = 'MEMBER') {
    await register.execute({ tenantId, name: 'Test', email, password: 'Fixture#1a', role: role as any })
    return identityRepo.items.find((i) => i.email.value === email)!
  }

  it('should update name and timezone for MEMBER in own tenant', async () => {
    const identity = await createUser('tenant-1', 'alice@test.com')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetIdentityId: identity.id.toString(),
      updates: { name: 'Alice Updated', timezone: 'Europe/London' },
    })

    expect(result.isRight()).toBe(true)
    const profile = profileRepo.items.find((p) => p.identityId === identity.id.toString())!
    expect(profile.name).toBe('Alice Updated')
    expect(profile.timezone).toBe('Europe/London')
  })

  it('should update role', async () => {
    const identity = await createUser('tenant-1', 'bob@test.com')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetIdentityId: identity.id.toString(),
      updates: { role: 'AGENT' },
    })

    expect(result.isRight()).toBe(true)
    const auth = authorizationRepo.items.find((a) => a.identityId === identity.id.toString())!
    expect(auth.role.value).toBe('AGENT')
  })

  it('should return UnauthorizedError for AGENT caller', async () => {
    const identity = await createUser('tenant-1', 'carol@test.com')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'AGENT',
      targetIdentityId: identity.id.toString(),
      updates: { name: 'Carol' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('should not allow MEMBER to update user in another tenant', async () => {
    const identity = await createUser('tenant-2', 'dan@test.com')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      targetIdentityId: identity.id.toString(),
      updates: { name: 'Dan' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('should allow PLATFORM_OWNER to update user in any tenant', async () => {
    const identity = await createUser('tenant-2', 'eve@test.com')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'PLATFORM_OWNER',
      targetIdentityId: identity.id.toString(),
      updates: { name: 'Eve Updated' },
    })

    expect(result.isRight()).toBe(true)
  })
})
