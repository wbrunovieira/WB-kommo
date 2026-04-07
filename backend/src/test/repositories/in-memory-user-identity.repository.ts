import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity.entity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'

export class InMemoryUserIdentityRepository implements IUserIdentityRepository {
  public items: UserIdentity[] = []

  async findById(id: UniqueEntityID): Promise<Either<Error, UserIdentity | null>> {
    const item = this.items.find((i) => i.id.equals(id) && !i.deletedAt)
    return right(item ?? null)
  }

  async findByEmail(tenantId: string, email: Email): Promise<Either<Error, UserIdentity | null>> {
    const item = this.items.find(
      (i) => i.tenantId === tenantId && i.email.equals(email) && !i.deletedAt,
    )
    return right(item ?? null)
  }

  async emailExists(tenantId: string, email: Email): Promise<Either<Error, boolean>> {
    const exists = this.items.some(
      (i) => i.tenantId === tenantId && i.email.equals(email) && !i.deletedAt,
    )
    return right(exists)
  }

  async save(identity: UserIdentity): Promise<Either<Error, void>> {
    const idx = this.items.findIndex((i) => i.id.equals(identity.id))
    if (idx >= 0) {
      this.items[idx] = identity
    } else {
      this.items.push(identity)
    }
    return right(undefined)
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    this.items = this.items.filter((i) => !i.id.equals(id))
    return right(undefined)
  }
}
