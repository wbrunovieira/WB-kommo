import { UserProfile as PrismaUserProfile, Prisma } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile.entity'

export class PrismaUserProfileMapper {
  static toDomain(raw: PrismaUserProfile): UserProfile {
    return UserProfile.reconstitute(
      {
        tenantId: raw.tenantId,
        identityId: raw.identityId,
        name: raw.name,
        avatarUrl: raw.avatarUrl ?? undefined,
        phone: raw.phone ?? undefined,
        timezone: raw.timezone,
        language: raw.language,
        deletedAt: raw.deletedAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(
    entity: UserProfile,
  ): Prisma.UserProfileUncheckedCreateInput {
    return {
      id: entity.id.toString(),
      tenantId: entity.tenantId,
      identityId: entity.identityId,
      name: entity.name,
      avatarUrl: entity.avatarUrl ?? null,
      phone: entity.phone ?? null,
      timezone: entity.timezone,
      language: entity.language,
      deletedAt: entity.deletedAt ?? null,
    }
  }
}
