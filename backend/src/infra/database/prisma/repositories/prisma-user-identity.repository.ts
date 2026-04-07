import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity.entity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { PrismaService } from '../prisma.service'
import { PrismaUserIdentityMapper } from '../mappers/prisma-user-identity.mapper'

@Injectable()
export class PrismaUserIdentityRepository implements IUserIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityID): Promise<Either<Error, UserIdentity | null>> {
    try {
      const raw = await this.prisma.userIdentity.findFirst({
        where: { id: id.toString(), deletedAt: null },
      })
      return right(raw ? PrismaUserIdentityMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find identity by id: ${err}`))
    }
  }

  async findByEmail(tenantId: string, email: Email): Promise<Either<Error, UserIdentity | null>> {
    try {
      const raw = await this.prisma.userIdentity.findFirst({
        where: { tenantId, email: email.value, deletedAt: null },
      })
      return right(raw ? PrismaUserIdentityMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find identity by email: ${err}`))
    }
  }

  async emailExists(tenantId: string, email: Email): Promise<Either<Error, boolean>> {
    try {
      const count = await this.prisma.userIdentity.count({
        where: { tenantId, email: email.value, deletedAt: null },
      })
      return right(count > 0)
    } catch (err) {
      return left(new Error(`Failed to check email existence: ${err}`))
    }
  }

  async save(identity: UserIdentity): Promise<Either<Error, void>> {
    try {
      const data = PrismaUserIdentityMapper.toPersistence(identity)
      await this.prisma.userIdentity.upsert({
        where: { id: data.id as string },
        create: data,
        update: {
          email: data.email,
          passwordHash: data.passwordHash,
          isEmailVerified: data.isEmailVerified,
          emailVerificationToken: data.emailVerificationToken,
          passwordResetToken: data.passwordResetToken,
          passwordResetExpiresAt: data.passwordResetExpiresAt,
          failedLoginAttempts: data.failedLoginAttempts,
          lockedUntil: data.lockedUntil,
          lastLoginAt: data.lastLoginAt,
          deletedAt: data.deletedAt,
        },
      })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to save identity: ${err}`))
    }
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    try {
      await this.prisma.userIdentity.delete({ where: { id: id.toString() } })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to delete identity: ${err}`))
    }
  }
}
