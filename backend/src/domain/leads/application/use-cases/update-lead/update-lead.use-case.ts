import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository } from '../../repositories/i-lead.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { Lead, LeadStatus } from '../../../enterprise/entities/lead.entity'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface UpdateLeadRequest {
  leadId: string
  tenantId: string
  actorUserId: string
  actorRole: RoleType
  actorIdentityId: string
  updates: {
    name?: string
    stageId?: string
    pipelineId?: string
    value?: number
    status?: LeadStatus
    assignedToId?: string
    tags?: string[]
  }
}

export type UpdateLeadResult = Either<LeadNotFoundError | UnauthorizedError | Error, Lead>

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    private readonly leadRepo: ILeadRepository,
    private readonly authorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(req: UpdateLeadRequest): Promise<UpdateLeadResult> {
    const leadResult = await this.leadRepo.findById(req.leadId, req.tenantId)
    if (leadResult.isLeft()) return left(leadResult.value)
    if (!leadResult.value) return left(new LeadNotFoundError())

    const lead = leadResult.value
    if (lead.isDeleted()) return left(new LeadNotFoundError())

    const role = UserRole.create(req.actorRole)

    if (role.isMember()) {
      // Check if member can edit all leads
      const authResult = await this.authorizationRepo.findByIdentityId(req.actorIdentityId)
      if (authResult.isLeft()) return left(authResult.value)

      const authorization = authResult.value
      const canEditAll = authorization?.can('canEditAllLeads') ?? false

      if (!canEditAll && lead.assignedToId !== req.actorUserId) {
        return left(new UnauthorizedError('You do not have permission to edit this lead'))
      }
    }

    // Apply updates
    const { updates } = req
    if (updates.name !== undefined) lead.rename(updates.name)
    if (updates.stageId !== undefined) lead.updateStage(updates.stageId)
    if (updates.pipelineId !== undefined) lead.updatePipeline(updates.pipelineId)
    if (updates.value !== undefined) lead.updateValue(updates.value)
    if (updates.assignedToId !== undefined) lead.assignTo(updates.assignedToId)
    if (updates.tags !== undefined) {
      // Replace all tags
      const currentTags = [...lead.tags]
      for (const tag of currentTags) {
        lead.removeTag(tag)
      }
      for (const tag of updates.tags) {
        lead.addTag(tag)
      }
    }
    if (updates.status !== undefined) {
      if (updates.status === 'WON') lead.markWon()
      else if (updates.status === 'LOST') lead.markLost()
      else if (updates.status === 'OPEN') lead.reopen()
    }

    const saveResult = await this.leadRepo.save(lead)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right(lead)
  }
}
