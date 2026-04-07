import { describe, it, expect, beforeEach } from 'vitest'
import { UserIdentity } from './user-identity.entity'
import { Email } from '../value-objects/email.vo'
import { Password } from '../value-objects/password.vo'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { UserCreatedEvent } from '../events/user-created.event'

async function makeIdentity(overrides: Partial<{
  email: string
  tenantId: string
}> = {}) {
  const password = await Password.create('P@ssw0rd!')
  return UserIdentity.create({
    tenantId: overrides.tenantId ?? 'tenant-1',
    email: Email.create(overrides.email ?? 'user@example.com'),
    password,
  })
}

describe('UserIdentity', () => {
  describe('create()', () => {
    it('should create with default values', async () => {
      const identity = await makeIdentity()
      expect(identity.isEmailVerified).toBe(false)
      expect(identity.failedLoginAttempts).toBe(0)
      expect(identity.isLocked()).toBe(false)
      expect(identity.deletedAt).toBeUndefined()
    })

    it('should emit UserCreatedEvent on creation', async () => {
      const identity = await makeIdentity()
      expect(identity.domainEvents).toHaveLength(1)
      expect(identity.domainEvents[0]).toBeInstanceOf(UserCreatedEvent)
    })
  })

  describe('reconstitute()', () => {
    it('should NOT emit domain events when reconstituting from DB', async () => {
      const password = await Password.create('P@ssw0rd!')
      const identity = UserIdentity.reconstitute(
        {
          tenantId: 'tenant-1',
          email: Email.createTrusted('user@example.com'),
          password,
          isEmailVerified: true,
          failedLoginAttempts: 0,
        },
        new UniqueEntityID('existing-id'),
      )
      expect(identity.domainEvents).toHaveLength(0)
      expect(identity.id.toString()).toBe('existing-id')
    })
  })

  describe('incrementFailedAttempts()', () => {
    it('should increment counter on each call', async () => {
      const identity = await makeIdentity()
      identity.incrementFailedAttempts()
      identity.incrementFailedAttempts()
      expect(identity.failedLoginAttempts).toBe(2)
    })

    it('should lock the account after 5 failed attempts', async () => {
      const identity = await makeIdentity()
      for (let i = 0; i < 5; i++) identity.incrementFailedAttempts()
      expect(identity.isLocked()).toBe(true)
      expect(identity.lockedUntil).toBeDefined()
    })
  })

  describe('resetFailedAttempts()', () => {
    it('should reset counter and unlock account', async () => {
      const identity = await makeIdentity()
      for (let i = 0; i < 5; i++) identity.incrementFailedAttempts()
      identity.resetFailedAttempts()
      expect(identity.failedLoginAttempts).toBe(0)
      expect(identity.isLocked()).toBe(false)
    })
  })

  describe('isLocked()', () => {
    it('should return false when lockedUntil is in the past', async () => {
      const identity = await makeIdentity()
      const past = new Date(Date.now() - 1000)
      identity.lockAccount(0)
      // force past date
      ;(identity as any).props.lockedUntil = past
      expect(identity.isLocked()).toBe(false)
    })

    it('should return true when lockedUntil is in the future', async () => {
      const identity = await makeIdentity()
      identity.lockAccount(15)
      expect(identity.isLocked()).toBe(true)
    })
  })

  describe('verifyEmail()', () => {
    it('should set isEmailVerified to true and clear token', async () => {
      const identity = await makeIdentity()
      ;(identity as any).props.emailVerificationToken = 'token123'
      identity.verifyEmail()
      expect(identity.isEmailVerified).toBe(true)
      expect(identity.emailVerificationToken).toBeUndefined()
    })
  })

  describe('requestPasswordReset()', () => {
    it('should set token and expiry', async () => {
      const identity = await makeIdentity()
      const token = identity.requestPasswordReset()
      expect(token).toBeDefined()
      expect(token.length).toBeGreaterThan(10)
      expect(identity.passwordResetToken).toBe(token)
      expect(identity.passwordResetExpiresAt).toBeDefined()
      expect(identity.passwordResetExpiresAt!.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('softDelete()', () => {
    it('should set deletedAt and anonymize email', async () => {
      const identity = await makeIdentity()
      identity.softDelete()
      expect(identity.deletedAt).toBeDefined()
      expect(identity.email.value).toContain('deleted')
    })
  })
})
