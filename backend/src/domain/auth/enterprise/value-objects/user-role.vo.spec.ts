import { describe, it, expect } from 'vitest'
import { UserRole, RoleType } from './user-role.vo'

describe('UserRole VO', () => {
  describe('PLATFORM_OWNER', () => {
    const role = UserRole.create('PLATFORM_OWNER')

    it('should identify as platform owner', () => {
      expect(role.isPlatformOwner()).toBe(true)
      expect(role.isReseller()).toBe(false)
      expect(role.isAccountAdmin()).toBe(false)
      expect(role.isMember()).toBe(false)
    })

    it('should be able to impersonate and see all tenants globally', () => {
      expect(role.canImpersonate()).toBe(true)
      expect(role.canSeeAllTenants()).toBe(true)
    })

    it('should have all elevated permissions', () => {
      expect(role.canCreateUsers()).toBe(true)
      expect(role.canDeleteUsers()).toBe(true)
      expect(role.canExportData()).toBe(true)
      expect(role.canViewBilling()).toBe(true)
      expect(role.canAccessAdminPanel()).toBe(true)
      expect(role.canManagePipelines()).toBe(true)
      expect(role.canCreateLeads()).toBe(true)
      expect(role.canDeleteLeads()).toBe(true)
    })

    it('isAdmin() should be true', () => {
      expect(role.isAdmin()).toBe(true)
    })
  })

  describe('RESELLER', () => {
    const role = UserRole.create('RESELLER')

    it('should identify as reseller', () => {
      expect(role.isReseller()).toBe(true)
      expect(role.isPlatformOwner()).toBe(false)
      expect(role.isAccountAdmin()).toBe(false)
      expect(role.isMember()).toBe(false)
    })

    it('should be able to impersonate but NOT see all tenants globally', () => {
      expect(role.canImpersonate()).toBe(true)
      expect(role.canSeeAllTenants()).toBe(false)
    })

    it('should have all elevated permissions', () => {
      expect(role.canCreateUsers()).toBe(true)
      expect(role.canDeleteUsers()).toBe(true)
      expect(role.canExportData()).toBe(true)
      expect(role.canViewBilling()).toBe(true)
      expect(role.canAccessAdminPanel()).toBe(true)
      expect(role.canManagePipelines()).toBe(true)
      expect(role.canCreateLeads()).toBe(true)
      expect(role.canDeleteLeads()).toBe(true)
    })

    it('isAdmin() should be true', () => {
      expect(role.isAdmin()).toBe(true)
    })
  })

  describe('ACCOUNT_ADMIN', () => {
    const role = UserRole.create('ACCOUNT_ADMIN')

    it('should identify as account admin', () => {
      expect(role.isAccountAdmin()).toBe(true)
      expect(role.isPlatformOwner()).toBe(false)
      expect(role.isReseller()).toBe(false)
      expect(role.isMember()).toBe(false)
    })

    it('should NOT be able to impersonate or see all tenants', () => {
      expect(role.canImpersonate()).toBe(false)
      expect(role.canSeeAllTenants()).toBe(false)
    })

    it('should have admin-level permissions within own tenant', () => {
      expect(role.canCreateUsers()).toBe(true)
      expect(role.canDeleteUsers()).toBe(true)
      expect(role.canExportData()).toBe(true)
      expect(role.canManagePipelines()).toBe(true)
      expect(role.canCreateLeads()).toBe(true)
    })

    it('isAdmin() should be true', () => {
      expect(role.isAdmin()).toBe(true)
    })
  })

  describe('MEMBER', () => {
    const role = UserRole.create('MEMBER')

    it('should identify as member', () => {
      expect(role.isMember()).toBe(true)
      expect(role.isPlatformOwner()).toBe(false)
      expect(role.isReseller()).toBe(false)
      expect(role.isAccountAdmin()).toBe(false)
    })

    it('should have limited permissions', () => {
      expect(role.canCreateLeads()).toBe(true)
      expect(role.canCreateUsers()).toBe(false)
      expect(role.canDeleteUsers()).toBe(false)
      expect(role.canDeleteLeads()).toBe(false)
      expect(role.canExportData()).toBe(false)
      expect(role.canImpersonate()).toBe(false)
      expect(role.canSeeAllTenants()).toBe(false)
    })

    it('isAdmin() should be false', () => {
      expect(role.isAdmin()).toBe(false)
    })
  })

  describe('equals()', () => {
    it('should be equal to same role type', () => {
      expect(UserRole.create('RESELLER').equals(UserRole.create('RESELLER'))).toBe(true)
    })

    it('should not be equal to different role type', () => {
      expect(UserRole.create('RESELLER').equals(UserRole.create('MEMBER'))).toBe(false)
    })
  })

  it('should throw for unknown role', () => {
    expect(() => UserRole.create('UNKNOWN' as RoleType)).toThrow()
  })
})
