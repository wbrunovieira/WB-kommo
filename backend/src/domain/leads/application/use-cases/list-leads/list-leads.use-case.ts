import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository, LeadFilters } from '../../repositories/i-lead.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { Lead } from '../../../enterprise/entities/lead.entity'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface ListLeadsRequest {
  tenantId: string
  actorUserId: string
  actorRole: RoleType
  actorIdentityId: string
  filters?: LeadFilters
}

export type ListLeadsResult = Either<Error, Lead[]>

@Injectable()
export class ListLeadsUseCase {
  constructor(
    private readonly leadRepo: ILeadRepository,
    private readonly authorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(req: ListLeadsRequest): Promise<ListLeadsResult> {
    const role = UserRole.create(req.actorRole)

    if (role.isMember()) {
      // Check if member has canViewAllLeads
      const authResult = await this.authorizationRepo.findByIdentityId(req.actorIdentityId)
      if (authResult.isLeft()) return left(authResult.value)

      const authorization = authResult.value
      const canViewAll = authorization?.can('canViewAllLeads') ?? false

      if (!canViewAll) {
        const result = await this.leadRepo.findByTenantAndOwner(req.tenantId, req.actorUserId)
        if (result.isLeft()) return left(result.value)
        return right(result.value)
      }
    }

    // ACCOUNT_ADMIN, PLATFORM_OWNER, RESELLER, or MEMBER with canViewAllLeads → see all
    const result = await this.leadRepo.findByTenant(req.tenantId, req.filters)
    if (result.isLeft()) return left(result.value)
    return right(result.value)
  }
}
