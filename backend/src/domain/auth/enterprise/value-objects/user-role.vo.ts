export type RoleType = 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER'

const VALID_ROLES: RoleType[] = ['RESELLER', 'ACCOUNT_ADMIN', 'MEMBER']

export class UserRole {
  private readonly _value: RoleType

  private constructor(value: RoleType) {
    this._value = value
  }

  static create(value: RoleType): UserRole {
    if (!VALID_ROLES.includes(value)) {
      throw new Error(`Invalid role: ${value}`)
    }
    return new UserRole(value)
  }

  get value(): RoleType {
    return this._value
  }

  isReseller(): boolean {
    return this._value === 'RESELLER'
  }

  isAccountAdmin(): boolean {
    return this._value === 'ACCOUNT_ADMIN'
  }

  isMember(): boolean {
    return this._value === 'MEMBER'
  }

  isAdmin(): boolean {
    return this._value === 'RESELLER' || this._value === 'ACCOUNT_ADMIN'
  }

  canImpersonate(): boolean {
    return this._value === 'RESELLER'
  }

  canManageAllTenants(): boolean {
    return this._value === 'RESELLER'
  }

  canCreateUsers(): boolean {
    return this._value !== 'MEMBER'
  }

  canUpdateUsers(): boolean {
    return this._value !== 'MEMBER'
  }

  canDeleteUsers(): boolean {
    return this._value !== 'MEMBER'
  }

  canListUsers(): boolean {
    return this._value !== 'MEMBER'
  }

  canManagePipelines(): boolean {
    return this._value !== 'MEMBER'
  }

  canCreateLeads(): boolean {
    return true
  }

  canDeleteLeads(): boolean {
    return this._value !== 'MEMBER'
  }

  canExportData(): boolean {
    return this._value !== 'MEMBER'
  }

  canViewBilling(): boolean {
    return this._value !== 'MEMBER'
  }

  canAccessAdminPanel(): boolean {
    return this._value !== 'MEMBER'
  }

  equals(other: UserRole): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
