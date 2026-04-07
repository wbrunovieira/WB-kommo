import { describe, it, expect } from 'vitest'
import { UniqueEntityID } from './unique-entity-id'

describe('UniqueEntityID', () => {
  it('should generate a UUID when no value is provided', () => {
    const id = new UniqueEntityID()
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('should use the provided value', () => {
    const id = new UniqueEntityID('custom-id-123')
    expect(id.value).toBe('custom-id-123')
    expect(id.toString()).toBe('custom-id-123')
  })

  it('should return true for equals() with same value', () => {
    const id1 = new UniqueEntityID('abc')
    const id2 = new UniqueEntityID('abc')
    expect(id1.equals(id2)).toBe(true)
  })

  it('should return false for equals() with different values', () => {
    const id1 = new UniqueEntityID('abc')
    const id2 = new UniqueEntityID('xyz')
    expect(id1.equals(id2)).toBe(false)
  })

  it('should generate unique IDs for each instance', () => {
    const id1 = new UniqueEntityID()
    const id2 = new UniqueEntityID()
    expect(id1.equals(id2)).toBe(false)
  })
})
