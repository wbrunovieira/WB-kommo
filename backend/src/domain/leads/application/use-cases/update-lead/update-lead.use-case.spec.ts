import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateLeadUseCase } from './update-lead.use-case'
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

describe('UpdateLeadUseCase', () => {
  let sut: UpdateLeadUseCase
  let leadRepo: InMemoryLeadRepository
  let authorizationRepo: InMemoryUserAuthorizationRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    authorizationRepo = new InMemoryUserAuthorizationRepository()
    sut = new UpdateLeadUseCase(leadRepo, authorizationRepo)
  })

  it('ACCOUNT_ADMIN updates any lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID, name: 'Original' }, new UniqueEntityID('lead-1'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-1',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
      updates: { name: 'Updated' },
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].name).toBe('Updated')
  })

  it('MEMBER updates own lead (no special permission needed)', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: MEMBER_ID, name: 'Original' }, new UniqueEntityID('lead-2'))
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
      updates: { name: 'Updated by Member' },
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].name).toBe('Updated by Member')
  })

  it('MEMBER with canEditAllLeads updates any lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }, new UniqueEntityID('lead-3'))
    leadRepo.items.push(lead)

    const auth = makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' })
    auth.addPermission('canEditAllLeads')
    authorizationRepo.items.push(auth)

    const result = await sut.execute({
      leadId: 'lead-3',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
      updates: { name: 'Edited by member with permission' },
    })

    expect(result.isRight()).toBe(true)
  })

  it('MEMBER without canEditAllLeads cannot update another user lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID, assignedToId: OTHER_MEMBER_ID }, new UniqueEntityID('lead-4'))
    leadRepo.items.push(lead)
    authorizationRepo.items.push(
      makeUserAuthorization({ tenantId: TENANT_ID, identityId: MEMBER_ID, role: 'MEMBER' }),
    )

    const result = await sut.execute({
      leadId: 'lead-4',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
      actorIdentityId: MEMBER_ID,
      updates: { name: 'Unauthorized' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('cannot update a soft-deleted lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-5'))
    lead.softDelete(ADMIN_ID)
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-5',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
      updates: { name: 'Cannot update deleted' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LeadNotFoundError)
  })

  it('partial update only changes provided fields', async () => {
    const lead = makeLead(
      { tenantId: TENANT_ID, assignedToId: ADMIN_ID, name: 'Original', value: 100, stageId: 'stage-original' },
      new UniqueEntityID('lead-6'),
    )
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-6',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
      actorIdentityId: ADMIN_ID,
      updates: { name: 'Partial Update' },
    })

    expect(result.isRight()).toBe(true)
    const updated = leadRepo.items[0]
    expect(updated.name).toBe('Partial Update')
    expect(updated.value).toBe(100)
    expect(updated.stageId).toBe('stage-original')
  })
})
