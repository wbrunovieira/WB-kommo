import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { IUserAggregatedViewRepository } from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { UnauthorizedError } from '../errors/unauthorized.error'
import { UserRole, RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

interface UpdateWorkspaceUserInput {
  callerTenantId: string
  callerRole: string
  targetIdentityId: string
  updates: {
    name?: string
    timezone?: string
    language?: string
    role?: RoleType
  }
}

type UpdateWorkspaceUserOutput = Either<Error, void>

@Injectable()
export class UpdateWorkspaceUserUseCase {
  constructor(
    private readonly identityRepo: IUserIdentityRepository,
    private readonly profileRepo: IUserProfileRepository,
    private readonly authorizationRepo: IUserAuthorizationRepository,
    private readonly aggregatedViewRepo: IUserAggregatedViewRepository,
  ) {}

  async execute(input: UpdateWorkspaceUserInput): Promise<UpdateWorkspaceUserOutput> {
    const callerRole = UserRole.create(input.callerRole as RoleType)

    if (!callerRole.canUpdateUsers()) {
      return left(new UnauthorizedError())
    }

    // Load identity to verify tenant scope
    const identityResult = await this.identityRepo.findById(
      new UniqueEntityID(input.targetIdentityId),
    )
    if (identityResult.isLeft()) return left(identityResult.value)
    const identity = identityResult.value
    if (!identity) return left(new Error('User not found'))

    // Non-platform-owners are restricted to own tenant
    if (!callerRole.canSeeAllTenants() && identity.tenantId !== input.callerTenantId) {
      return left(new UnauthorizedError())
    }

    // Update profile if any profile fields provided
    const { name, timezone, language } = input.updates
    if (name !== undefined || timezone !== undefined || language !== undefined) {
      const profileResult = await this.profileRepo.findByIdentityId(input.targetIdentityId)
      if (profileResult.isLeft()) return left(profileResult.value)
      const profile = profileResult.value
      if (!profile) return left(new Error('User profile not found'))

      profile.updateProfile({ name, timezone, language })

      const saveResult = await this.profileRepo.save(profile)
      if (saveResult.isLeft()) return left(saveResult.value)
    }

    // Update role if provided
    if (input.updates.role !== undefined) {
      const authResult = await this.authorizationRepo.findByIdentityId(input.targetIdentityId)
      if (authResult.isLeft()) return left(authResult.value)
      const authorization = authResult.value
      if (!authorization) return left(new Error('User authorization not found'))

      authorization.updateRole(UserRole.create(input.updates.role))

      const saveResult = await this.authorizationRepo.save(authorization)
      if (saveResult.isLeft()) return left(saveResult.value)
    }

    return right(undefined)
  }
}
