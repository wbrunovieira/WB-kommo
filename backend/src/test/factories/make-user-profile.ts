import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export function makeUserProfile(
  overrides: Partial<{
    tenantId: string
    identityId: string
    name: string
    timezone: string
    language: string
  }> = {},
  id?: UniqueEntityID,
): UserProfile {
  return UserProfile.create(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      identityId: overrides.identityId ?? 'identity-1',
      name: overrides.name ?? 'Test User',
      timezone: overrides.timezone,
      language: overrides.language,
    },
    id,
  )
}
