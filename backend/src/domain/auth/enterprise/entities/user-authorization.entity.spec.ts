import { describe, it, expect } from 'vitest'
import { UserAuthorization } from './user-authorization.entity'
import { UserRole } from '../value-objects/user-role.vo'

function makeAuth(role: 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER' = 'MEMBER') {
  return UserAuthorization.create({
    tenantId: 'tenant-1',
    identityId: 'identity-1',
    role: UserRole.create(role),
  })
}

describe('UserAuthorization', () => {
  describe('isActive()', () => {
    it('should be active when no effectiveUntil is set', () => {
      expect(makeAuth().isActive()).toBe(true)
    })

    it('should be active when effectiveUntil is in the future', () => {
      const auth = UserAuthorization.create({
        tenantId: 'tenant-1',
        identityId: 'identity-1',
        role: UserRole.create('MEMBER'),
        effectiveUntil: new Date(Date.now() + 86400000),
      })
      expect(auth.isActive()).toBe(true)
    })

    it('should be inactive when effectiveUntil is in the past', () => {
      const auth = UserAuthorization.create({
        tenantId: 'tenant-1',
        identityId: 'identity-1',
        role: UserRole.create('MEMBER'),
        effectiveUntil: new Date(Date.now() - 1000),
      })
      expect(auth.isActive()).toBe(false)
    })
  })

  describe('can()', () => {
    it('should allow custom permission added explicitly', () => {
      const auth = makeAuth('MEMBER')
      auth.addPermission('leads:export')
      expect(auth.can('leads:export')).toBe(true)
    })

    it('should deny permission not in list for MEMBER', () => {
      const auth = makeAuth('MEMBER')
      expect(auth.can('leads:export')).toBe(false)
    })

    it('should deny permission when in restrictions list', () => {
      const auth = makeAuth('ACCOUNT_ADMIN')
      auth.restrict('leads:delete')
      expect(auth.can('leads:delete')).toBe(false)
    })
  })

  describe('addPermission() / removePermission()', () => {
    it('should add and then remove a permission', () => {
      const auth = makeAuth()
      auth.addPermission('reports:view')
      expect(auth.customPermissions).toContain('reports:view')
      auth.removePermission('reports:view')
      expect(auth.customPermissions).not.toContain('reports:view')
    })

    it('should not duplicate permissions', () => {
      const auth = makeAuth()
      auth.addPermission('reports:view')
      auth.addPermission('reports:view')
      expect(auth.customPermissions.filter((p) => p === 'reports:view')).toHaveLength(1)
    })
  })

  describe('restrict()', () => {
    it('should add a restriction', () => {
      const auth = makeAuth()
      auth.restrict('leads:import')
      expect(auth.restrictions).toContain('leads:import')
    })
  })
})
