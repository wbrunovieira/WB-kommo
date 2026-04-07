import { describe, it, expect } from 'vitest'
import { SessionToken } from './session-token.vo'

describe('SessionToken VO', () => {
  describe('generate()', () => {
    it('should generate a raw token and its SHA256 hash', () => {
      const token = SessionToken.generate()
      expect(token.rawToken).toBeDefined()
      expect(token.rawToken.length).toBeGreaterThan(20)
      expect(token.hash).toBeDefined()
      expect(token.hash).not.toBe(token.rawToken)
    })

    it('should generate different tokens on each call', () => {
      const t1 = SessionToken.generate()
      const t2 = SessionToken.generate()
      expect(t1.rawToken).not.toBe(t2.rawToken)
      expect(t1.hash).not.toBe(t2.hash)
    })

    it('should produce consistent hash for same raw token', () => {
      const token = SessionToken.generate()
      const fromHash = SessionToken.createFromHash(token.hash)
      expect(fromHash.hash).toBe(token.hash)
    })
  })

  describe('createFromHash()', () => {
    it('should create a token from an existing hash (no raw token)', () => {
      const token = SessionToken.createFromHash('somehash')
      expect(token.hash).toBe('somehash')
      expect(token.rawToken).toBeNull()
    })
  })

  describe('equals()', () => {
    it('should be equal when hashes match', () => {
      const t1 = SessionToken.generate()
      const t2 = SessionToken.createFromHash(t1.hash)
      expect(t1.equals(t2)).toBe(true)
    })

    it('should not be equal when hashes differ', () => {
      const t1 = SessionToken.generate()
      const t2 = SessionToken.generate()
      expect(t1.equals(t2)).toBe(false)
    })
  })
})
