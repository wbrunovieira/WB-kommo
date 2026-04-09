import { describe, it, expect, beforeEach } from 'vitest'
import { SoftDeleteWorkspaceUserUseCase } from './soft-delete-workspace-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { RegisterUserUseCase } from '../register-user/register-user.use-case'
import { UnauthorizedError } from '../errors/unauthorized.error'

describe('SoftDeleteWorkspaceUserUseCase', () => {
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository
  let register: RegisterUserUseCase
  let sut: SoftDeleteWorkspaceUserUseCase

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    register = new RegisterUserUseCase(identityRepo, profileRepo, authorizationRepo)
    sut = new SoftDeleteWorkspaceUserUseCase(identityRepo, profileRepo)
  })

  async function createUser(tenantId: string, email: string, role = 'MEMBER') {
    await register.execute({ tenantId, name: 'Test', email, password: 'Fixture#1a', role: role as any })
    return identityRepo.items.find((i) => i.email.value === email)!
  }

  it('should soft-delete identity and profile', async () => {
    const caller = await createUser('tenant-1', 'admin@test.com', 'MEMBER')
    const target = await createUser('tenant-1', 'agent@test.com', 'AGENT')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      callerIdentityId: caller.id.toString(),
      targetIdentityId: target.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    const deletedIdentity = identityRepo.items.find((i) => i.id.equals(target.id))!
    expect(deletedIdentity.deletedAt).toBeDefined()
    const deletedProfile = profileRepo.items.find((p) => p.identityId === target.id.toString())!
    expect(deletedProfile.deletedAt).toBeDefined()
  })

  it('should not be findable after soft-delete (excluded from list)', async () => {
    const caller = await createUser('tenant-1', 'admin@test.com', 'MEMBER')
    const target = await createUser('tenant-1', 'agent@test.com', 'AGENT')

    await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      callerIdentityId: caller.id.toString(),
      targetIdentityId: target.id.toString(),
    })

    const found = await identityRepo.findById(target.id)
    expect(found.isRight()).toBe(true)
    expect(found.value).toBeNull()
  })

  it('should return UnauthorizedError for AGENT caller', async () => {
    const caller = await createUser('tenant-1', 'agent@test.com', 'AGENT')
    const target = await createUser('tenant-1', 'other@test.com', 'MEMBER')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'AGENT',
      callerIdentityId: caller.id.toString(),
      targetIdentityId: target.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('should not allow self-deletion', async () => {
    const caller = await createUser('tenant-1', 'admin@test.com', 'MEMBER')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      callerIdentityId: caller.id.toString(),
      targetIdentityId: caller.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('own account')
  })

  it('should not allow MEMBER to delete user in another tenant', async () => {
    const caller = await createUser('tenant-1', 'admin@test.com', 'MEMBER')
    const target = await createUser('tenant-2', 'other@test.com', 'AGENT')

    const result = await sut.execute({
      callerTenantId: 'tenant-1',
      callerRole: 'MEMBER',
      callerIdentityId: caller.id.toString(),
      targetIdentityId: target.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })
})
