import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository } from '../../repositories/i-lead.repository'
import { LeadNotFoundError } from '../../errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface RestoreLeadRequest {
  leadId: string
  tenantId: string
  actorUserId: string
  actorRole: RoleType
}

export type RestoreLeadResult = Either<LeadNotFoundError | UnauthorizedError | Error, void>

@Injectable()
export class RestoreLeadUseCase {
  constructor(private readonly leadRepo: ILeadRepository) {}

  async execute(req: RestoreLeadRequest): Promise<RestoreLeadResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.isAccountAdmin()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN can restore leads'))
    }

    // Use findDeleted to get all deleted leads, then filter by leadId
    const deletedResult = await this.leadRepo.findDeleted(req.tenantId)
    if (deletedResult.isLeft()) return left(deletedResult.value)

    const deletedLead = deletedResult.value.find((l) => l.id.toString() === req.leadId)
    if (!deletedLead) return left(new LeadNotFoundError())

    deletedLead.restore()

    const saveResult = await this.leadRepo.save(deletedLead)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right(undefined)
  }
}
