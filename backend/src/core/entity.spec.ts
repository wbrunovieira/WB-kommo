import { describe, it, expect } from 'vitest'
import { Entity } from './entity'
import { UniqueEntityID } from './utils/unique-entity-id'

interface StubProps {
  name: string
}

class StubEntity extends Entity<StubProps> {
  static create(props: StubProps, id?: UniqueEntityID): StubEntity {
    return new StubEntity(props, id)
  }

  get name(): string {
    return this.props.name
  }
}

describe('Entity', () => {
  it('should generate an id when none is provided', () => {
    const entity = StubEntity.create({ name: 'test' })
    expect(entity.id).toBeDefined()
    expect(entity.id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('should use the provided id', () => {
    const id = new UniqueEntityID('fixed-id')
    const entity = StubEntity.create({ name: 'test' }, id)
    expect(entity.id.toString()).toBe('fixed-id')
  })

  it('should be equal to itself', () => {
    const entity = StubEntity.create({ name: 'test' })
    expect(entity.equals(entity)).toBe(true)
  })

  it('should be equal to another entity with the same id', () => {
    const id = new UniqueEntityID('same-id')
    const e1 = StubEntity.create({ name: 'A' }, id)
    const e2 = StubEntity.create({ name: 'B' }, id)
    expect(e1.equals(e2)).toBe(true)
  })

  it('should not be equal to an entity with a different id', () => {
    const e1 = StubEntity.create({ name: 'A' })
    const e2 = StubEntity.create({ name: 'A' })
    expect(e1.equals(e2)).toBe(false)
  })
})
