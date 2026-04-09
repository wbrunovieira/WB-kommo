import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository } from '../../repositories/i-lead.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { Lead } from '../../../enterprise/entities/lead.entity'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface GetLeadRequest {
  leadId: string
  tenantId: string
  actorUserId: string
  actorRole: RoleType
  actorIdentityId: string
}

export type GetLeadResult = Either<LeadNotFoundError | UnauthorizedError | Error, Lead>

@Injectable()
export class GetLeadUseCase {
  constructor(
    private readonly leadRepo: ILeadRepository,
    private readonly authorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(req: GetLeadRequest): Promise<GetLeadResult> {
    const leadResult = await this.leadRepo.findById(req.leadId, req.tenantId)
    if (leadResult.isLeft()) return left(leadResult.value)
    if (!leadResult.value) return left(new LeadNotFoundError())

    const lead = leadResult.value

    // findById in InMemoryLeadRepository returns even deleted leads (no isDeleted filter)
    // so we must check manually
    if (lead.isDeleted()) return left(new LeadNotFoundError())

    const role = UserRole.create(req.actorRole)

    if (role.isMember()) {
      // Check if member can view all leads
      const authResult = await this.authorizationRepo.findByIdentityId(req.actorIdentityId)
      if (authResult.isLeft()) return left(authResult.value)

      const authorization = authResult.value
      const canViewAll = authorization?.can('canViewAllLeads') ?? false

      if (!canViewAll && lead.assignedToId !== req.actorUserId) {
        return left(new UnauthorizedError('You do not have permission to view this lead'))
      }
    }

    return right(lead)
  }
}
