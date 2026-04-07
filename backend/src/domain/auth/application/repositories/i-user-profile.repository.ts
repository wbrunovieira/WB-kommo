import { Either } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserProfile } from '../../enterprise/entities/user-profile.entity'

export abstract class IUserProfileRepository {
  abstract findById(id: UniqueEntityID): Promise<Either<Error, UserProfile | null>>
  abstract findByIdentityId(identityId: string): Promise<Either<Error, UserProfile | null>>
  abstract save(profile: UserProfile): Promise<Either<Error, void>>
  abstract delete(id: UniqueEntityID): Promise<Either<Error, void>>
}
