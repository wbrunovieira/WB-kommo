import { describe, it, expect } from 'vitest'
import { Email } from './email.vo'

describe('Email VO', () => {
  describe('create()', () => {
    it('should create a valid email normalized to lowercase', () => {
      const email = Email.create('User@Example.COM')
      expect(email.value).toBe('user@example.com')
    })

    it('should throw for email without @', () => {
      expect(() => Email.create('invalidemail')).toThrow()
    })

    it('should throw for email with empty local part', () => {
      expect(() => Email.create('@example.com')).toThrow()
    })

    it('should throw for email with empty domain', () => {
      expect(() => Email.create('user@')).toThrow()
    })

    it('should throw for email exceeding 254 chars', () => {
      const local = 'a'.repeat(65)
      expect(() => Email.create(`${local}@example.com`)).toThrow()
    })

    it('should throw for email with consecutive dots in local part', () => {
      expect(() => Email.create('user..name@example.com')).toThrow()
    })

    it('should throw for email with leading dot in local part', () => {
      expect(() => Email.create('.user@example.com')).toThrow()
    })

    it('should throw for email with trailing dot in local part', () => {
      expect(() => Email.create('user.@example.com')).toThrow()
    })

    it('should accept email with subdomain', () => {
      const email = Email.create('user@mail.example.com')
      expect(email.value).toBe('user@mail.example.com')
    })
  })

  describe('createTrusted()', () => {
    it('should skip validation and create email from trusted source', () => {
      const email = Email.createTrusted('already@normalized.com')
      expect(email.value).toBe('already@normalized.com')
    })
  })

  describe('equals()', () => {
    it('should be equal to another email with the same value', () => {
      const a = Email.create('user@example.com')
      const b = Email.create('user@example.com')
      expect(a.equals(b)).toBe(true)
    })

    it('should not be equal to an email with different value', () => {
      const a = Email.create('a@example.com')
      const b = Email.create('b@example.com')
      expect(a.equals(b)).toBe(false)
    })

    it('should be equal regardless of input casing', () => {
      const a = Email.create('User@Example.com')
      const b = Email.create('user@example.com')
      expect(a.equals(b)).toBe(true)
    })
  })
})
