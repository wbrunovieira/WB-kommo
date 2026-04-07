import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization.entity'
import { UserRole, RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export function makeUserAuthorization(
  overrides: Partial<{
    tenantId: string
    identityId: string
    role: RoleType
    effectiveUntil: Date
  }> = {},
  id?: UniqueEntityID,
): UserAuthorization {
  return UserAuthorization.create(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      identityId: overrides.identityId ?? 'identity-1',
      role: UserRole.create(overrides.role ?? 'MEMBER'),
      effectiveUntil: overrides.effectiveUntil,
    },
    id,
  )
}
