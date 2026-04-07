import { Either } from '@/core/errors/either'
import { UserIdentity } from '../../enterprise/entities/user-identity.entity'
import { UserProfile } from '../../enterprise/entities/user-profile.entity'
import { UserAuthorization } from '../../enterprise/entities/user-authorization.entity'

export interface UserAggregatedView {
  identity: UserIdentity
  profile: UserProfile
  authorization: UserAuthorization
}

export abstract class IUserAggregatedViewRepository {
  abstract findByEmail(
    tenantId: string,
    email: string,
  ): Promise<Either<Error, UserAggregatedView | null>>
}
