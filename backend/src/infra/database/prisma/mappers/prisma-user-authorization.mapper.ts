import { UserAuthorization as PrismaUserAuthorization, Prisma, RoleType } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization.entity'
import { UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export class PrismaUserAuthorizationMapper {
  static toDomain(raw: PrismaUserAuthorization): UserAuthorization {
    return UserAuthorization.reconstitute(
      {
        tenantId: raw.tenantId,
        identityId: raw.identityId,
        role: UserRole.create(raw.role as 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER'),
        customPermissions: raw.customPermissions as string[],
        restrictions: raw.restrictions as string[],
        effectiveFrom: raw.effectiveFrom,
        effectiveUntil: raw.effectiveUntil ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(
    entity: UserAuthorization,
  ): Prisma.UserAuthorizationUncheckedCreateInput {
    return {
      id: entity.id.toString(),
      tenantId: entity.tenantId,
      identityId: entity.identityId,
      role: entity.role.value as RoleType,
      customPermissions: entity.customPermissions,
      restrictions: entity.restrictions,
      effectiveFrom: entity.effectiveFrom ?? new Date(),
      effectiveUntil: entity.effectiveUntil ?? null,
    }
  }
}
