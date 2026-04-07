import { Either, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization.entity'

export class InMemoryUserAuthorizationRepository implements IUserAuthorizationRepository {
  public items: UserAuthorization[] = []

  async findById(id: UniqueEntityID): Promise<Either<Error, UserAuthorization | null>> {
    return right(this.items.find((i) => i.id.equals(id)) ?? null)
  }

  async findByIdentityId(identityId: string): Promise<Either<Error, UserAuthorization | null>> {
    return right(this.items.find((i) => i.identityId === identityId) ?? null)
  }

  async save(authorization: UserAuthorization): Promise<Either<Error, void>> {
    const idx = this.items.findIndex((i) => i.id.equals(authorization.id))
    if (idx >= 0) {
      this.items[idx] = authorization
    } else {
      this.items.push(authorization)
    }
    return right(undefined)
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    this.items = this.items.filter((i) => !i.id.equals(id))
    return right(undefined)
  }
}
