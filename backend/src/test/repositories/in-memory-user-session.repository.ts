import { Either, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserSessionRepository } from '@/domain/auth/application/repositories/i-user-session.repository'
import { UserSession } from '@/domain/auth/enterprise/entities/user-session.entity'

export class InMemoryUserSessionRepository implements IUserSessionRepository {
  public items: UserSession[] = []

  async findById(id: UniqueEntityID): Promise<Either<Error, UserSession | null>> {
    return right(this.items.find((i) => i.id.equals(id)) ?? null)
  }

  async findByRefreshTokenHash(hash: string): Promise<Either<Error, UserSession | null>> {
    const item = this.items.find((i) => i.refreshToken.hash === hash && i.isValid())
    return right(item ?? null)
  }

  async findActiveByIdentityId(identityId: string): Promise<Either<Error, UserSession[]>> {
    return right(this.items.filter((i) => i.identityId === identityId && i.isValid()))
  }

  async save(session: UserSession): Promise<Either<Error, void>> {
    const idx = this.items.findIndex((i) => i.id.equals(session.id))
    if (idx >= 0) {
      this.items[idx] = session
    } else {
      this.items.push(session)
    }
    return right(undefined)
  }

  async revokeAllByIdentityId(identityId: string): Promise<Either<Error, void>> {
    this.items
      .filter((i) => i.identityId === identityId && i.isValid())
      .forEach((s) => s.revoke())
    return right(undefined)
  }
}
