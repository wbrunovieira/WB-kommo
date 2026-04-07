import { Either } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserSession } from '../../enterprise/entities/user-session.entity'
import { SessionToken } from '../../enterprise/value-objects/session-token.vo'

export abstract class IUserSessionRepository {
  abstract findById(id: UniqueEntityID): Promise<Either<Error, UserSession | null>>
  abstract findByRefreshTokenHash(hash: string): Promise<Either<Error, UserSession | null>>
  abstract findActiveByIdentityId(identityId: string): Promise<Either<Error, UserSession[]>>
  abstract save(session: UserSession): Promise<Either<Error, void>>
  abstract revokeAllByIdentityId(identityId: string): Promise<Either<Error, void>>
}
