import { describe, it, expect, beforeEach } from 'vitest'
import { RestoreLeadUseCase } from './restore-lead.use-case'
import { InMemoryLeadRepository } from '@/test/repositories/in-memory-lead.repository'
import { makeLead } from '@/test/factories/make-lead'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'

describe('RestoreLeadUseCase', () => {
  let sut: RestoreLeadUseCase
  let leadRepo: InMemoryLeadRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    sut = new RestoreLeadUseCase(leadRepo)
  })

  it('ACCOUNT_ADMIN restores a soft-deleted lead', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-1'))
    lead.softDelete(ADMIN_ID)
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-1',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].isDeleted()).toBe(false)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-2'))
    lead.softDelete(ADMIN_ID)
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

  it('lead not soft-deleted returns LeadNotFoundError (must be in deleted state to restore)', async () => {
    // Lead exists but is NOT deleted
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-3'))
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-3',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LeadNotFoundError)
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

  it('no expiry — restores regardless of when it was deleted', async () => {
    const lead = makeLead({ tenantId: TENANT_ID }, new UniqueEntityID('lead-5'))
    lead.softDelete(ADMIN_ID)
    // Simulate deleted a long time ago
    ;(lead as any).props.deletedAt = new Date('2020-01-01')
    leadRepo.items.push(lead)

    const result = await sut.execute({
      leadId: 'lead-5',
      tenantId: TENANT_ID,
      actorUserId: ADMIN_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].isDeleted()).toBe(false)
  })
})
