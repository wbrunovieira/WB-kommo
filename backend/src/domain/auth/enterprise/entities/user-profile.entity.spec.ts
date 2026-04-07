import { describe, it, expect } from 'vitest'
import { UserProfile } from './user-profile.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

function makeProfile(overrides: Partial<{
  name: string
  tenantId: string
  identityId: string
}> = {}) {
  return UserProfile.create({
    tenantId: overrides.tenantId ?? 'tenant-1',
    identityId: overrides.identityId ?? 'identity-1',
    name: overrides.name ?? 'John Doe',
  })
}

describe('UserProfile', () => {
  describe('create()', () => {
    it('should create with default timezone and language', () => {
      const profile = makeProfile()
      expect(profile.timezone).toBe('America/Sao_Paulo')
      expect(profile.language).toBe('pt-BR')
      expect(profile.deletedAt).toBeUndefined()
    })

    it('should accept custom timezone and language', () => {
      const profile = UserProfile.create({
        tenantId: 'tenant-1',
        identityId: 'identity-1',
        name: 'John',
        timezone: 'Europe/Rome',
        language: 'it-IT',
      })
      expect(profile.timezone).toBe('Europe/Rome')
      expect(profile.language).toBe('it-IT')
    })
  })

  describe('reconstitute()', () => {
    it('should restore with provided id', () => {
      const id = new UniqueEntityID('profile-id')
      const profile = UserProfile.reconstitute(
        { tenantId: 'tenant-1', identityId: 'identity-1', name: 'Jane', timezone: 'UTC', language: 'en-US' },
        id,
      )
      expect(profile.id.toString()).toBe('profile-id')
    })
  })

  describe('updateProfile()', () => {
    it('should update allowed fields', () => {
      const profile = makeProfile({ name: 'Old Name' })
      profile.updateProfile({ name: 'New Name', phone: '+5511999999' })
      expect(profile.name).toBe('New Name')
      expect(profile.phone).toBe('+5511999999')
    })

    it('should not override fields with undefined', () => {
      const profile = makeProfile({ name: 'Preserved' })
      profile.updateProfile({ phone: '+5511111111' })
      expect(profile.name).toBe('Preserved')
    })
  })

  describe('softDelete()', () => {
    it('should set deletedAt', () => {
      const profile = makeProfile()
      profile.softDelete()
      expect(profile.deletedAt).toBeDefined()
    })
  })
})
