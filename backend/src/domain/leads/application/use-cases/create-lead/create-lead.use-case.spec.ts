import { describe, it, expect, beforeEach } from 'vitest'
import { CreateLeadUseCase } from './create-lead.use-case'
import { InMemoryLeadRepository } from '@/test/repositories/in-memory-lead.repository'
import { InMemoryPlanRepository } from '@/test/repositories/in-memory-plan.repository'
import { InMemoryTenantRepository } from '@/test/repositories/in-memory-tenant.repository'
import { makeLead } from '@/test/factories/make-lead'
import { makePlan } from '@/test/factories/make-plan'
import { PlanLimitExceededError } from '../../errors/plan-limit-exceeded.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { Tenant } from '@/domain/tenants/enterprise/entities/tenant.entity'

const TENANT_ID = 'tenant-1'
const PLAN_ID = 'plan-1'

function seedTenantAndPlan(
  tenantRepo: InMemoryTenantRepository,
  planRepo: InMemoryPlanRepository,
  maxLeads: number,
) {
  const plan = makePlan({ maxLeads }, new UniqueEntityID(PLAN_ID))
  planRepo.items.push(plan)

  const tenant = Tenant.create(
    { name: 'Acme', slug: 'acme', planId: PLAN_ID, resellerTenantId: null },
    new UniqueEntityID(TENANT_ID),
  )
  tenantRepo.savedTenants.push(tenant)
  tenantRepo.items.push({
    id: TENANT_ID,
    name: 'Acme',
    slug: 'acme',
    planId: PLAN_ID,
    isActive: true,
    resellerTenantId: null,
  })
}

describe('CreateLeadUseCase', () => {
  let sut: CreateLeadUseCase
  let leadRepo: InMemoryLeadRepository
  let planRepo: InMemoryPlanRepository
  let tenantRepo: InMemoryTenantRepository

  beforeEach(() => {
    leadRepo = new InMemoryLeadRepository()
    planRepo = new InMemoryPlanRepository()
    tenantRepo = new InMemoryTenantRepository()
    sut = new CreateLeadUseCase(leadRepo, planRepo, tenantRepo)
  })

  it('creates a lead when plan has capacity', async () => {
    seedTenantAndPlan(tenantRepo, planRepo, 10)

    const result = await sut.execute({
      tenantId: TENANT_ID,
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      name: 'New Lead',
      actorUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.leadId).toBeDefined()
    expect(leadRepo.items).toHaveLength(1)
    expect(leadRepo.items[0].status).toBe('OPEN')
  })

  it('returns PlanLimitExceededError when plan is at limit', async () => {
    seedTenantAndPlan(tenantRepo, planRepo, 1)
    leadRepo.items.push(makeLead({ tenantId: TENANT_ID }))

    const result = await sut.execute({
      tenantId: TENANT_ID,
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      name: 'New Lead',
      actorUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanLimitExceededError)
  })

  it('creates lead when plan is unlimited (maxLeads: -1)', async () => {
    seedTenantAndPlan(tenantRepo, planRepo, -1)
    for (let i = 0; i < 999; i++) {
      leadRepo.items.push(makeLead({ tenantId: TENANT_ID }))
    }

    const result = await sut.execute({
      tenantId: TENANT_ID,
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      name: 'Lead 1000',
      actorUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
  })

  it('returns error when tenant not found', async () => {
    const result = await sut.execute({
      tenantId: 'non-existent-tenant',
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      name: 'New Lead',
      actorUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
  })

  it('defaults assignedToId to actorUserId when not provided', async () => {
    seedTenantAndPlan(tenantRepo, planRepo, 10)

    const result = await sut.execute({
      tenantId: TENANT_ID,
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      name: 'New Lead',
      actorUserId: 'user-42',
    })

    expect(result.isRight()).toBe(true)
    expect(leadRepo.items[0].assignedToId).toBe('user-42')
  })
})
