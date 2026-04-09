import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import {
  IUserAggregatedViewRepository,
  UserAggregatedView,
} from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { UnauthorizedError } from '../errors/unauthorized.error'
import { UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

interface ListWorkspaceUsersInput {
  /** tenantId from the JWT of the calling user */
  callerTenantId: string
  /** role from the JWT of the calling user */
  callerRole: string
  /** tenantId to list users from — must equal callerTenantId unless caller is PLATFORM_OWNER */
  targetTenantId: string
}

type ListWorkspaceUsersOutput = Either<Error, UserAggregatedView[]>

@Injectable()
export class ListWorkspaceUsersUseCase {
  constructor(private readonly aggregatedViewRepo: IUserAggregatedViewRepository) {}

  async execute(input: ListWorkspaceUsersInput): Promise<ListWorkspaceUsersOutput> {
    const role = UserRole.create(input.callerRole as any)

    if (!role.canListUsers()) {
      return left(new UnauthorizedError())
    }

    // Non-platform-owners can only list users in their own tenant
    if (!role.canSeeAllTenants() && input.callerTenantId !== input.targetTenantId) {
      return left(new UnauthorizedError())
    }

    const result = await this.aggregatedViewRepo.findByTenant(input.targetTenantId)
    if (result.isLeft()) return left(result.value)

    return right(result.value)
  }
}
