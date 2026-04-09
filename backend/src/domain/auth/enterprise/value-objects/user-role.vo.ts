export type RoleType = 'PLATFORM_OWNER' | 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER' | 'AGENT'

const VALID_ROLES: RoleType[] = ['PLATFORM_OWNER', 'RESELLER', 'ACCOUNT_ADMIN', 'MEMBER', 'AGENT']

// Role hierarchy (higher index = lower privilege)
const ROLE_RANK: Record<RoleType, number> = {
  PLATFORM_OWNER: 0,
  RESELLER: 1,
  ACCOUNT_ADMIN: 2,
  MEMBER: 3,
  AGENT: 4,
}

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

  isPlatformOwner(): boolean { return this._value === 'PLATFORM_OWNER' }
  isReseller(): boolean      { return this._value === 'RESELLER' }
  isAccountAdmin(): boolean  { return this._value === 'ACCOUNT_ADMIN' }
  isMember(): boolean        { return this._value === 'MEMBER' }
  isAgent(): boolean         { return this._value === 'AGENT' }

  isAdmin(): boolean {
    return this._value === 'PLATFORM_OWNER' || this._value === 'RESELLER' || this._value === 'ACCOUNT_ADMIN'
  }

  /** Returns true if this role is equal or higher privilege than the given role. */
  isAtLeast(role: RoleType): boolean {
    return ROLE_RANK[this._value] <= ROLE_RANK[role]
  }

  canImpersonate(): boolean {
    return this._value === 'PLATFORM_OWNER' || this._value === 'RESELLER'
  }

  canSeeAllTenants(): boolean {
    return this._value === 'PLATFORM_OWNER'
  }

  // ── Workspace user management ─────────────────────────────────────────────
  // MEMBER is now the workspace admin role — can manage users in own workspace.
  // AGENT is the new restricted role (seller/secretary).

  canCreateUsers(): boolean  { return this._value !== 'AGENT' }
  canUpdateUsers(): boolean  { return this._value !== 'AGENT' }
  canDeleteUsers(): boolean  { return this._value !== 'AGENT' }
  canListUsers(): boolean    { return this._value !== 'AGENT' }

  // ── Pipeline management ───────────────────────────────────────────────────
  canManagePipelines(): boolean { return this._value !== 'AGENT' }

  // ── Leads ─────────────────────────────────────────────────────────────────
  canCreateLeads(): boolean { return true }

  canDeleteLeads(): boolean {
    return this._value === 'ACCOUNT_ADMIN' || this._value === 'MEMBER'
  }

  canAccessCrmDirectly(): boolean {
    return this._value === 'ACCOUNT_ADMIN' || this._value === 'MEMBER' || this._value === 'AGENT'
  }

  // ── Platform-level ────────────────────────────────────────────────────────
  canManageOwnClients(): boolean {
    return this._value === 'PLATFORM_OWNER' || this._value === 'RESELLER'
  }

  canExportData(): boolean    { return this._value !== 'AGENT' }
  canViewBilling(): boolean   { return this._value !== 'AGENT' }
  canAccessAdminPanel(): boolean { return this._value !== 'AGENT' }

  equals(other: UserRole): boolean { return this._value === other._value }
  toString(): string { return this._value }
}
