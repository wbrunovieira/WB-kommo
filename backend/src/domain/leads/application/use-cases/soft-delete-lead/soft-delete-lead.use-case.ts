import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository } from '../../repositories/i-lead.repository'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface SoftDeleteLeadRequest {
  leadId: string
  tenantId: string
  actorUserId: string
  actorRole: RoleType
}

export type SoftDeleteLeadResult = Either<LeadNotFoundError | UnauthorizedError | Error, void>

@Injectable()
export class SoftDeleteLeadUseCase {
  constructor(private readonly leadRepo: ILeadRepository) {}

  async execute(req: SoftDeleteLeadRequest): Promise<SoftDeleteLeadResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.isAccountAdmin()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN can delete leads'))
    }

    const leadResult = await this.leadRepo.findById(req.leadId, req.tenantId)
    if (leadResult.isLeft()) return left(leadResult.value)
    if (!leadResult.value) return left(new LeadNotFoundError())

    const lead = leadResult.value

    // Idempotent: if already deleted, just return right
    if (lead.isDeleted()) return right(undefined)

    lead.softDelete(req.actorUserId)

    const saveResult = await this.leadRepo.save(lead)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right(undefined)
  }
}
