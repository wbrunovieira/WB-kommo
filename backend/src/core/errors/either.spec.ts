import { describe, it, expect } from 'vitest'
import { left, right, Left, Right } from './either'

describe('Either', () => {
  describe('left()', () => {
    it('should create a Left with the given value', () => {
      const result = left<Error, string>(new Error('fail'))
      expect(result.isLeft()).toBe(true)
      expect(result.isRight()).toBe(false)
      expect(result.value).toBeInstanceOf(Error)
    })

    it('should be an instance of Left', () => {
      const result = left('error')
      expect(result).toBeInstanceOf(Left)
    })
  })

  describe('right()', () => {
    it('should create a Right with the given value', () => {
      const result = right<Error, string>('success')
      expect(result.isRight()).toBe(true)
      expect(result.isLeft()).toBe(false)
      expect(result.value).toBe('success')
    })

    it('should be an instance of Right', () => {
      const result = right(42)
      expect(result).toBeInstanceOf(Right)
    })
  })

  describe('type narrowing', () => {
    it('should narrow to Left when isLeft() is true', () => {
      const result = left<string, number>('err')
      if (result.isLeft()) {
        expect(result.value).toBe('err')
      }
    })

    it('should narrow to Right when isRight() is true', () => {
      const result = right<string, number>(99)
      if (result.isRight()) {
        expect(result.value).toBe(99)
      }
    })
  })
})
