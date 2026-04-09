import { describe, it, expect, beforeEach } from 'vitest'
import { ListLeadsUseCase } from './list-leads.use-case'
import { InMemoryLeadRepository } from '@/test/repositories/in-memory-lead.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { makeLead } from '@/test/factories/make-lead'
import { makeUserAuthorization } from '@/test/factories/make-user-authorization'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'
const OTHER_MEMBER_ID = 'other-member'

describe('ListLeadsUseCase', () => {
  let sut: ListLeadsUseCase
  let leadRepo: InMemoryLeadRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    sut = new ListLeadsUseCase(leadRepo, authorizationRepo)
  })

  it('ACCOUNT_ADMIN sees all leads in tenant', async () => {
    leadRepo.items.push(
      makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: ADMIN_ID }),
    )

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(3)
  })

  it('MEMBER without canViewAllLeads sees only own leads', async () => {
    leadRepo.items.push(
      makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }),
    )

    // member auth without canViewAllLeads
    authorizationRepo.items.push(
      makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' }),
    )

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
    expect(result.value.every((l) => l.assignedToId === MEMBER_ID)).toBe(true)
  })

  it('MEMBER with canViewAllLeads sees all leads', async () => {
    leadRepo.items.push(
      makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }),
    )

    const auth = makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' })
    auth.addPermission('canViewAllLeads')
    authorizationRepo.items.push(auth)

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
  })

  it('PLATFORM_OWNER via impersonation sees all leads (treated as admin scope)', async () => {
    leadRepo.items.push(
      makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }),
      makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }),
    )

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: 'platform-owner',
      actorRole: 'PLATFORM_OWNER',
      actorIdentityId: 'platform-owner',
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
  })

  it('does not return soft-deleted leads', async () => {
    const activeLead = makeLead({ tenantId: TENANT_ID })
    const deletedLead = makeLead({ tenantId: TENANT_ID })
    deletedLead.softDelete(ADMIN_ID)
    leadRepo.items.push(activeLead, deletedLead)

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(1)
  })

  it('applies pipeline filter when provided', async () => {
    leadRepo.items.push(
      makeLead({ tenantId: TENANT_ID, pipelineId: 'pipeline-A' }),
      makeLead({ tenantId: TENANT_ID, pipelineId: 'pipeline-A' }),
      makeLead({ tenantId: TENANT_ID, pipelineId: 'pipeline-B' }),
    )

    const result = await sut.execute({
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
      filters: { pipelineId: 'pipeline-A' },
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
  })
})
