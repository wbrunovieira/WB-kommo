import { UserSession as PrismaUserSession, Prisma } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserSession } from '@/domain/auth/enterprise/entities/user-session.entity'
import { SessionToken } from '@/domain/auth/enterprise/value-objects/session-token.vo'

export class PrismaUserSessionMapper {
  static toDomain(raw: PrismaUserSession): UserSession {
    return UserSession.reconstitute(
      {
        tenantId: raw.tenantId,
        identityId: raw.identityId,
        refreshToken: SessionToken.createFromHash(raw.refreshTokenHash),
        ipAddress: raw.ipAddress ?? undefined,
        userAgent: raw.userAgent ?? undefined,
        isImpersonation: raw.isImpersonation,
        impersonatorId: raw.impersonatorId ?? undefined,
        expiresAt: raw.expiresAt,
        revokedAt: raw.revokedAt ?? undefined,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(
    entity: UserSession,
  ): Prisma.UserSessionUncheckedCreateInput {
    return {
      id: entity.id.toString(),
      tenantId: entity.tenantId,
      identityId: entity.identityId,
      refreshTokenHash: entity.refreshToken.hash,
      ipAddress: entity.ipAddress ?? null,
      userAgent: entity.userAgent ?? null,
      isImpersonation: entity.isImpersonation,
      impersonatorId: entity.impersonatorId ?? null,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt ?? null,
    }
  }
}
