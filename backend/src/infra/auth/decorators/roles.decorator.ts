import { SetMetadata } from '@nestjs/common'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles)
