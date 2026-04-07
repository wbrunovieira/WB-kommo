import { Either, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile.entity'

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  public items: UserProfile[] = []

  async findById(id: UniqueEntityID): Promise<Either<Error, UserProfile | null>> {
    return right(this.items.find((i) => i.id.equals(id)) ?? null)
  }

  async findByIdentityId(identityId: string): Promise<Either<Error, UserProfile | null>> {
    return right(this.items.find((i) => i.identityId === identityId) ?? null)
  }

  async save(profile: UserProfile): Promise<Either<Error, void>> {
    const idx = this.items.findIndex((i) => i.id.equals(profile.id))
    if (idx >= 0) {
      this.items[idx] = profile
    } else {
      this.items.push(profile)
    }
    return right(undefined)
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    this.items = this.items.filter((i) => !i.id.equals(id))
    return right(undefined)
  }
}
