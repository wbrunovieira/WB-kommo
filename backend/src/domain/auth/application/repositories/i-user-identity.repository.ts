import { Either } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserIdentity } from '../../enterprise/entities/user-identity.entity'
import { Email } from '../../enterprise/value-objects/email.vo'

export abstract class IUserIdentityRepository {
  abstract findById(id: UniqueEntityID): Promise<Either<Error, UserIdentity | null>>
  abstract findByEmail(tenantId: string, email: Email): Promise<Either<Error, UserIdentity | null>>
  abstract emailExists(tenantId: string, email: Email): Promise<Either<Error, boolean>>
  abstract save(identity: UserIdentity): Promise<Either<Error, void>>
  abstract delete(id: UniqueEntityID): Promise<Either<Error, void>>
}
