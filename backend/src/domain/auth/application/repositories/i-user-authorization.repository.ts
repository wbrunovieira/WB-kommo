import { Either } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserAuthorization } from '../../enterprise/entities/user-authorization.entity'

export abstract class IUserAuthorizationRepository {
  abstract findById(id: UniqueEntityID): Promise<Either<Error, UserAuthorization | null>>
  abstract findByIdentityId(identityId: string): Promise<Either<Error, UserAuthorization | null>>
  abstract save(authorization: UserAuthorization): Promise<Either<Error, void>>
  abstract delete(id: UniqueEntityID): Promise<Either<Error, void>>
}
