import { Either, right } from '@/core/errors/either'
import {
  IUserAggregatedViewRepository,
  UserAggregatedView,
} from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { InMemoryUserIdentityRepository } from './in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from './in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from './in-memory-user-authorization.repository'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'

export class InMemoryUserAggregatedViewRepository implements IUserAggregatedViewRepository {
  constructor(
    private readonly identityRepo: InMemoryUserIdentityRepository,
    private readonly profileRepo: InMemoryUserProfileRepository,
    private readonly authorizationRepo: InMemoryUserAuthorizationRepository,
  ) {}

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<Either<Error, UserAggregatedView | null>> {
    const emailVO = Email.createTrusted(email)
    const identityResult = await this.identityRepo.findByEmail(tenantId, emailVO)
    if (identityResult.isLeft()) return identityResult
    const identity = identityResult.value
    if (!identity) return right(null)

    const profileResult = await this.profileRepo.findByIdentityId(identity.id.toString())
    if (profileResult.isLeft()) return profileResult
    const profile = profileResult.value
    if (!profile) return right(null)

    const authResult = await this.authorizationRepo.findByIdentityId(identity.id.toString())
    if (authResult.isLeft()) return authResult
    const authorization = authResult.value
    if (!authorization) return right(null)

    return right({ identity, profile, authorization })
  }
}
