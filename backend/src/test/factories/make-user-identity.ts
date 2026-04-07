import { Password } from '@/domain/auth/enterprise/value-objects/password.vo'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { UserIdentity, UserIdentityProps } from '@/domain/auth/enterprise/entities/user-identity.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

type FactoryProps = Partial<Omit<UserIdentityProps, 'email' | 'password'>> & {
  email?: string
  passwordHash?: string
}

export async function makeUserIdentity(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): Promise<UserIdentity> {
  const password = Password.createFromHash(
    overrides.passwordHash ?? '$2a$01$testHashForTestingPurposes000000000000',
  )
  return UserIdentity.create(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      email: Email.createTrusted(overrides.email ?? 'user@example.com'),
      password,
    },
    id,
  )
}

export function makeUserIdentitySync(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): UserIdentity {
  const password = Password.createFromHash(
    overrides.passwordHash ?? '$2a$01$testHashForTestingPurposes000000000000',
  )
  return UserIdentity.reconstitute(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      email: Email.createTrusted(overrides.email ?? 'user@example.com'),
      password,
      isEmailVerified: overrides.isEmailVerified ?? true,
      failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
      lockedUntil: overrides.lockedUntil,
      deletedAt: overrides.deletedAt,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    },
    id ?? new UniqueEntityID(),
  )
}
