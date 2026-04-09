import { describe, it, expect, beforeEach } from 'vitest'
import { SoftDeleteLeadUseCase } from './soft-delete-lead.use-case'
import { InMemoryLeadRepository } from '@/test/repositories/in-memory-lead.repository'
import { makeLead } from '@/test/factories/make-lead'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'

describe('SoftDeleteLeadUseCase', () => {
  let sut: SoftDeleteLeadUseCase
  let leadRepo: InMemoryLeadRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    sut = new SoftDeleteLeadUseCase(leadRepo)
  })

  it('ACCOUNT_ADMIN soft-deletes a lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-1'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-1',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].isDeleted()).toBe(true)
    expect(leadRepo.items[0].deletedByUserId).toBe(ADMIN_ID)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-2'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-2',
      tenantId: TENANT_ID,
      actorUserId: MEMBER_ID,
      actorRole: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('RESELLER returns UnauthorizedError (only ACCOUNT_ADMIN can delete)', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-3'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-3',
      tenantId: TENANT_ID,
      actorUserId: 'reseller-user',
      actorRole: 'RESELLER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('lead not found returns LeadNotFoundError', async () => {
    const result = await sut.execute({
      leadId: 'non-existent',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LeadNotFoundError)
  })

  it('soft-deleting already-deleted lead is idempotent (returns right)', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-4'))
    lead.softDelete(ADMIN_ID)
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-4',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
  })
})
