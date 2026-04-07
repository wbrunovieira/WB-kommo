import {
  UserIdentity as PrismaUserIdentity,
  Prisma,
} from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity.entity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { Password } from '@/domain/auth/enterprise/value-objects/password.vo'

export class PrismaUserIdentityMapper {
  static toDomain(raw: PrismaUserIdentity): UserIdentity {
    return UserIdentity.reconstitute(
      {
        tenantId: raw.tenantId,
        email: Email.createTrusted(raw.email),
        password: Password.createFromHash(raw.passwordHash),
        isEmailVerified: raw.isEmailVerified,
        emailVerificationToken: raw.emailVerificationToken ?? undefined,
        passwordResetToken: raw.passwordResetToken ?? undefined,
        passwordResetExpiresAt: raw.passwordResetExpiresAt ?? undefined,
        failedLoginAttempts: raw.failedLoginAttempts,
        lockedUntil: raw.lockedUntil ?? undefined,
        lastLoginAt: raw.lastLoginAt ?? undefined,
        deletedAt: raw.deletedAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(
    entity: UserIdentity,
  ): Prisma.UserIdentityUncheckedCreateInput {
    return {
      id: entity.id.toString(),
      tenantId: entity.tenantId,
      email: entity.email.value,
      passwordHash: entity.password.value,
      isEmailVerified: entity.isEmailVerified,
      emailVerificationToken: entity.emailVerificationToken ?? null,
      passwordResetToken: entity.passwordResetToken ?? null,
      passwordResetExpiresAt: entity.passwordResetExpiresAt ?? null,
      failedLoginAttempts: entity.failedLoginAttempts,
      lockedUntil: entity.lockedUntil ?? null,
      lastLoginAt: entity.lastLoginAt ?? null,
      deletedAt: entity.deletedAt ?? null,
    }
  }
}
