import { describe, it, expect } from 'vitest'
import { Password } from './password.vo'

describe('Password VO', () => {
  describe('create()', () => {
    it('should hash a valid password', async () => {
      const pwd = await Password.create('Fixture#1a')
      expect(pwd.value).not.toBe('Fixture#1a')
      expect(pwd.value.length).toBeGreaterThan(20)
    })

    it('should throw for password shorter than 8 chars', async () => {
      await expect(Password.create('Ab1!')).rejects.toThrow()
    })

    it('should throw for password longer than 100 chars', async () => {
      await expect(Password.create('A1!' + 'a'.repeat(99))).rejects.toThrow()
    })

    it('should throw when missing uppercase letter', async () => {
      await expect(Password.create('p@ssw0rd!')).rejects.toThrow()
    })

    it('should throw when missing lowercase letter', async () => {
      await expect(Password.create('P@SSW0RD!')).rejects.toThrow()
    })

    it('should throw when missing number', async () => {
      await expect(Password.create('P@ssword!')).rejects.toThrow()
    })

    it('should throw when missing special character', async () => {
      await expect(Password.create('Password1')).rejects.toThrow()
    })

    it('should throw for common passwords', async () => {
      await expect(Password.create('Password1!')).rejects.toThrow()
    })
  })

  describe('compare()', () => {
    it('should return true for correct raw password', async () => {
      const pwd = await Password.create('Fixture#1a')
      expect(await pwd.compare('Fixture#1a')).toBe(true)
    })

    it('should return false for wrong raw password', async () => {
      const pwd = await Password.create('Fixture#1a')
      expect(await pwd.compare('Wrong1@pass')).toBe(false)
    })
  })

  describe('createFromHash()', () => {
    it('should create password from existing hash without re-hashing', async () => {
      const original = await Password.create('Fixture#1a')
      const fromHash = Password.createFromHash(original.value)
      expect(await fromHash.compare('Fixture#1a')).toBe(true)
    })
  })

  describe('generate()', () => {
    it('should generate a password that passes its own validation', async () => {
      const raw = Password.generate()
      expect(raw.length).toBeGreaterThanOrEqual(12)
      await expect(Password.create(raw)).resolves.toBeDefined()
    })
  })
})
