import { describe, it, expect } from 'vitest'
import { UserSession } from './user-session.entity'
import { SessionToken } from '../value-objects/session-token.vo'

function makeSession(overrides: Partial<{
  expiresInMinutes: number
  isImpersonation: boolean
}> = {}) {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + (overrides.expiresInMinutes ?? 60))
  return UserSession.create({
    tenantId: 'tenant-1',
    identityId: 'identity-1',
    refreshToken: SessionToken.generate(),
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    expiresAt,
    isImpersonation: overrides.isImpersonation ?? false,
  })
}

describe('UserSession', () => {
  describe('isValid()', () => {
    it('should be valid when not expired and not revoked', () => {
      expect(makeSession().isValid()).toBe(true)
    })

    it('should be invalid when expired', () => {
      const session = makeSession({ expiresInMinutes: -1 })
      expect(session.isValid()).toBe(false)
    })

    it('should be invalid when revoked', () => {
      const session = makeSession()
      session.revoke()
      expect(session.isValid()).toBe(false)
    })
  })

  describe('revoke()', () => {
    it('should set revokedAt', () => {
      const session = makeSession()
      session.revoke()
      expect(session.revokedAt).toBeDefined()
    })
  })

  describe('isImpersonation flag', () => {
    it('should store impersonation info', () => {
      const session = UserSession.create({
        tenantId: 'tenant-1',
        identityId: 'reseller-id',
        refreshToken: SessionToken.generate(),
        expiresAt: new Date(Date.now() + 60000),
        isImpersonation: true,
        impersonatorId: 'reseller-id',
      })
      expect(session.isImpersonation).toBe(true)
      expect(session.impersonatorId).toBe('reseller-id')
    })
  })

  describe('role', () => {
    it('should store and expose the role', () => {
      const session = UserSession.create({
        tenantId: 'tenant-1',
        identityId: 'identity-1',
        refreshToken: SessionToken.generate(),
        expiresAt: new Date(Date.now() + 60000),
        isImpersonation: false,
        role: 'PLATFORM_OWNER',
      })
      expect(session.role).toBe('PLATFORM_OWNER')
    })

    it('should default to MEMBER when role is not provided', () => {
      const session = UserSession.create({
        tenantId: 'tenant-1',
        identityId: 'identity-1',
        refreshToken: SessionToken.generate(),
        expiresAt: new Date(Date.now() + 60000),
        isImpersonation: false,
      })
      expect(session.role).toBe('MEMBER')
    })
  })
})
