import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserSessionRepository } from '@/domain/auth/application/repositories/i-user-session.repository'
import { UserSession } from '@/domain/auth/enterprise/entities/user-session.entity'
import { PrismaService } from '../prisma.service'
import { PrismaUserSessionMapper } from '../mappers/prisma-user-session.mapper'

@Injectable()
export class PrismaUserSessionRepository implements IUserSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityID): Promise<Either<Error, UserSession | null>> {
    try {
      const raw = await this.prisma.userSession.findUnique({ where: { id: id.toString() } })
      return right(raw ? PrismaUserSessionMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find session: ${err}`))
    }
  }

  async findByRefreshTokenHash(hash: string): Promise<Either<Error, UserSession | null>> {
    try {
      const now = new Date()
      const raw = await this.prisma.userSession.findFirst({
        where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: now } },
      })
      return right(raw ? PrismaUserSessionMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find session by token hash: ${err}`))
    }
  }

  async findActiveByIdentityId(identityId: string): Promise<Either<Error, UserSession[]>> {
    try {
      const now = new Date()
      const rows = await this.prisma.userSession.findMany({
        where: { identityId, revokedAt: null, expiresAt: { gt: now } },
      })
      return right(rows.map(PrismaUserSessionMapper.toDomain))
    } catch (err) {
      return left(new Error(`Failed to find sessions: ${err}`))
    }
  }

  async save(session: UserSession): Promise<Either<Error, void>> {
    try {
      const data = PrismaUserSessionMapper.toPersistence(session)
      await this.prisma.userSession.upsert({
        where: { id: data.id as string },
        create: data,
        update: {
          refreshTokenHash: data.refreshTokenHash,
          revokedAt: data.revokedAt,
          expiresAt: data.expiresAt,
        },
      })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to save session: ${err}`))
    }
  }

  async revokeAllByIdentityId(identityId: string): Promise<Either<Error, void>> {
    try {
      await this.prisma.userSession.updateMany({
        where: { identityId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to revoke sessions: ${err}`))
    }
  }
}
