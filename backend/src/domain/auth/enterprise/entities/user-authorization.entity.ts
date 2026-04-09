import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserRole } from '../value-objects/user-role.vo'

export interface UserAuthorizationProps {
  tenantId: string
  identityId: string
  role: UserRole
  customPermissions: string[]
  restrictions: string[]
  effectiveFrom: Date
  effectiveUntil?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class UserAuthorization extends Entity<UserAuthorizationProps> {
  private constructor(props: UserAuthorizationProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<UserAuthorizationProps, 'tenantId' | 'identityId' | 'role'> &
      Partial<Pick<UserAuthorizationProps, 'effectiveUntil' | 'customPermissions' | 'restrictions'>>,
    id?: UniqueEntityID,
  ): UserAuthorization {
    return new UserAuthorization(
      {
        ...props,
        customPermissions: props.customPermissions ?? [],
        restrictions: props.restrictions ?? [],
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: UserAuthorizationProps, id: UniqueEntityID): UserAuthorization {
    return new UserAuthorization(props, id)
  }

  get tenantId(): string { return this.props.tenantId }
  get identityId(): string { return this.props.identityId }
  get role(): UserRole { return this.props.role }
  get customPermissions(): string[] { return this.props.customPermissions }
  get restrictions(): string[] { return this.props.restrictions }
  get effectiveFrom(): Date { return this.props.effectiveFrom }
  get effectiveUntil(): Date | undefined { return this.props.effectiveUntil }

  isActive(): boolean {
    if (!this.props.effectiveUntil) return true
    return this.props.effectiveUntil > new Date()
  }

  can(permission: string): boolean {
    if (this.props.restrictions.includes(permission)) return false
    return this.props.customPermissions.includes(permission)
  }

  addPermission(permission: string): void {
    if (!this.props.customPermissions.includes(permission)) {
      this.props.customPermissions.push(permission)
      this.touch()
    }
  }

  removePermission(permission: string): void {
    this.props.customPermissions = this.props.customPermissions.filter(
      (p) => p !== permission,
    )
    this.touch()
  }

  restrict(restriction: string): void {
    if (!this.props.restrictions.includes(restriction)) {
      this.props.restrictions.push(restriction)
      this.touch()
    }
  }

  updateRole(role: UserRole): void {
    this.props.role = role
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
