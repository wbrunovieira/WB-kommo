import { Either, left, right } from '@/core/errors/either'
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
    if (identityResult.isLeft()) return left(identityResult.value)
    const identity = identityResult.value
    if (!identity) return right(null)

    const profileResult = await this.profileRepo.findByIdentityId(identity.id.toString())
    if (profileResult.isLeft()) return left(profileResult.value)
    const profile = profileResult.value
    if (!profile) return right(null)

    const authResult = await this.authorizationRepo.findByIdentityId(identity.id.toString())
    if (authResult.isLeft()) return left(authResult.value)
    const authorization = authResult.value
    if (!authorization) return right(null)

    return right({ identity, profile, authorization })
  }

  async findByTenant(tenantId: string): Promise<Either<Error, UserAggregatedView[]>> {
    const identities = this.identityRepo.items.filter(
      (i) => i.tenantId === tenantId && !i.deletedAt,
    )

    const views: UserAggregatedView[] = []
    for (const identity of identities) {
      const profileResult = await this.profileRepo.findByIdentityId(identity.id.toString())
      if (profileResult.isLeft()) return left(profileResult.value)
      const profile = profileResult.value
      if (!profile) continue

      const authResult = await this.authorizationRepo.findByIdentityId(identity.id.toString())
      if (authResult.isLeft()) return left(authResult.value)
      const authorization = authResult.value
      if (!authorization) continue

      views.push({ identity, profile, authorization })
    }

    return right(views)
  }
}
