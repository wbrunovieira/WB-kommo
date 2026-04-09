import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository } from '../../repositories/i-lead.repository'
import { IPlanRepository } from '@/domain/plans/application/repositories/i-plan.repository'
import { ITenantRepository } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { Lead } from '../../../enterprise/entities/lead.entity'
import { PlanLimitExceededError } from '../../errors/plan-limit-exceeded.error'
import { PlanLimitService } from '../../services/plan-limit.service'

export interface CreateLeadRequest {
  tenantId: string
  pipelineId: string
  stageId: string
  name: string
  value?: number
  assignedToId?: string
  tags?: string[]
  actorUserId: string
}

export interface CreateLeadResponse {
  leadId: string
}

export type CreateLeadResult = Either<PlanLimitExceededError | Error, CreateLeadResponse>

@Injectable()
export class CreateLeadUseCase {
  constructor(
    private readonly leadRepo: ILeadRepository,
    private readonly planRepo: IPlanRepository,
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async execute(req: CreateLeadRequest): Promise<CreateLeadResult> {
    // 1. Find tenant to get planId
    const tenantResult = await this.tenantRepo.findById(req.tenantId)
    if (tenantResult.isLeft()) return left(tenantResult.value)
    if (!tenantResult.value) return left(new Error('Tenant not found'))

    const tenant = tenantResult.value

    // 2. Find plan
    const planResult = await this.planRepo.findById(tenant.planId)
    if (planResult.isLeft()) return left(planResult.value)
    if (!planResult.value) return left(new Error('Plan not found'))

    const plan = planResult.value

    // 3. Count current leads
    const countResult = await this.leadRepo.countByTenant(req.tenantId)
    if (countResult.isLeft()) return left(countResult.value)

    // 4. PlanLimitService.check
    const limitCheck = PlanLimitService.check(plan, countResult.value)
    if (limitCheck.isLeft()) return left(limitCheck.value)

    // 5. Lead.create
    const lead = Lead.create({
      tenantId: req.tenantId,
      pipelineId: req.pipelineId,
      stageId: req.stageId,
      name: req.name,
      value: req.value,
      assignedToId: req.assignedToId ?? req.actorUserId,
      tags: req.tags,
    })

    // 6. save
    const saveResult = await this.leadRepo.save(lead)
    if (saveResult.isLeft()) return left(saveResult.value)

    // 7. return
    return right({ leadId: lead.id.toString() })
  }
}
