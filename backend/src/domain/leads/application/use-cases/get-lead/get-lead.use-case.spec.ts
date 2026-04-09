import { describe, it, expect, beforeEach } from 'vitest'
import { GetLeadUseCase } from './get-lead.use-case'
import { InMemoryLeadRepository } from '@/test/repositories/in-memory-lead.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/in-memory-user-authorization.repository'
import { makeLead } from '@/test/factories/make-lead'
import { makeUserAuthorization } from '@/test/factories/make-user-authorization'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'
const OTHER_MEMBER_ID = 'other-member'

describe('GetLeadUseCase', () => {
  let sut: GetLeadUseCase
  let leadRepo: InMemoryLeadRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    sut = new GetLeadUseCase(leadRepo, authorizationRepo)
  })

  it('ACCOUNT_ADMIN gets any lead in tenant', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }, new UniqueEntityID('lead-1'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-1',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.id.toString()).toBe('lead-1')
  })

  it('MEMBER gets own lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID }, new UniqueEntityID('lead-2'))
    leadRepo.items.push(lead)
    authorizationRepo.items.push(
      makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' }),
    )

    const result = await sut.execute({
      leadId: 'lead-2',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
    })

    expect(result.isRight()).toBe(true)
  })

  it('MEMBER without canViewAllLeads cannot get another user lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }, new UniqueEntityID('lead-3'))
    leadRepo.items.push(lead)
    authorizationRepo.items.push(
      makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' }),
    )

    const result = await sut.execute({
      leadId: 'lead-3',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('MEMBER with canViewAllLeads gets any lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }, new UniqueEntityID('lead-4'))
    leadRepo.items.push(lead)

    const auth = makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' })
    auth.addPermission('canViewAllLeads')
    authorizationRepo.items.push(auth)

    const result = await sut.execute({
      leadId: 'lead-4',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
    })

    expect(result.isRight()).toBe(true)
  })

  it('returns LeadNotFoundError when lead does not exist', async () => {
    const result = await sut.execute({
      leadId: 'non-existent',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LeadNotFoundError)
  })

  it('returns LeadNotFoundError when lead is soft-deleted', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-5'))
    lead.softDelete(ADMIN_ID)
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-5',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LeadNotFoundError)
  })
})
