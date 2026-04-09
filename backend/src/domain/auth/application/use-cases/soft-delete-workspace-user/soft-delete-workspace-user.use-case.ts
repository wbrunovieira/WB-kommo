import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { UnauthorizedError } from '../errors/unauthorized.error'
import { UserRole, RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

interface SoftDeleteWorkspaceUserInput {
  callerTenantId: string
  callerRole: string
  /** The identity ID of the user performing the action — self-deletion not allowed */
  callerIdentityId: string
  targetIdentityId: string
}

type SoftDeleteWorkspaceUserOutput = Either<Error, void>

@Injectable()
export class SoftDeleteWorkspaceUserUseCase {
  constructor(
    private readonly identityRepo: IUserIdentityRepository,
    private readonly profileRepo: IUserProfileRepository,
  ) {}

  async execute(input: SoftDeleteWorkspaceUserInput): Promise<SoftDeleteWorkspaceUserOutput> {
    const callerRole = UserRole.create(input.callerRole as RoleType)

    if (!callerRole.canDeleteUsers()) {
      return left(new UnauthorizedError())
    }

    if (input.callerIdentityId === input.targetIdentityId) {
      return left(new Error('Cannot delete your own account'))
    }

    const identityResult = await this.identityRepo.findById(
      new UniqueEntityID(input.targetIdentityId),
    )
    if (identityResult.isLeft()) return left(identityResult.value)
    const identity = identityResult.value
    if (!identity) return left(new Error('User not found'))

    // Scope check
    if (!callerRole.canSeeAllTenants() && identity.tenantId !== input.callerTenantId) {
      return left(new UnauthorizedError())
    }

    // Soft-delete identity
    identity.softDelete()
    const saveIdentityResult = await this.identityRepo.save(identity)
    if (saveIdentityResult.isLeft()) return left(saveIdentityResult.value)

    // Soft-delete profile
    const profileResult = await this.profileRepo.findByIdentityId(input.targetIdentityId)
    if (profileResult.isRight() && profileResult.value) {
      profileResult.value.softDelete()
      await this.profileRepo.save(profileResult.value)
    }

    return right(undefined)
  }
}
