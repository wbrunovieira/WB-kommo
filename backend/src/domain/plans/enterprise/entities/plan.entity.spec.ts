import { describe, it, expect } from 'vitest'
import { Plan } from './plan.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

describe('Plan entity', () => {
  it('create() sets all fields with defaults', () => {
    const plan = Plan.create({
      name: 'Starter',
      maxUsers: 5,
      maxLeads: 100,
      price: 49.9,
    })

    expect(plan.name).toBe('Starter')
    expect(plan.maxUsers).toBe(5)
    expect(plan.maxLeads).toBe(100)
    expect(plan.price).toBe(49.9)
    expect(plan.createdAt).toBeInstanceOf(Date)
    expect(plan.updatedAt).toBeInstanceOf(Date)
    expect(plan.id).toBeDefined()
  })

  it('isUnlimited() returns true when maxLeads is -1', () => {
    const plan = Plan.create({ name: 'Enterprise', maxUsers: 999, maxLeads: -1, price: 0 })
    expect(plan.isUnlimited()).toBe(true)
  })

  it('isUnlimited() returns false when maxLeads is positive', () => {
    const plan = Plan.create({ name: 'Starter', maxUsers: 5, maxLeads: 100, price: 49.9 })
    expect(plan.isUnlimited()).toBe(false)
  })

  it('hasLeadCapacity() returns true when count < maxLeads', () => {
    const plan = Plan.create({ name: 'Starter', maxUsers: 5, maxLeads: 100, price: 49.9 })
    expect(plan.hasLeadCapacity(99)).toBe(true)
  })

  it('hasLeadCapacity() returns false when count >= maxLeads', () => {
    const plan = Plan.create({ name: 'Starter', maxUsers: 5, maxLeads: 100, price: 49.9 })
    expect(plan.hasLeadCapacity(100)).toBe(false)
    expect(plan.hasLeadCapacity(150)).toBe(false)
  })

  it('hasLeadCapacity() always returns true when unlimited', () => {
    const plan = Plan.create({ name: 'Enterprise', maxUsers: 999, maxLeads: -1, price: 0 })
    expect(plan.hasLeadCapacity(0)).toBe(true)
    expect(plan.hasLeadCapacity(999999)).toBe(true)
  })

  it('reconstitute() restores from persistence', () => {
    const id = new UniqueEntityID('plan-123')
    const createdAt = new Date('2024-01-01')
    const updatedAt = new Date('2024-06-01')

    const plan = Plan.reconstitute(
      { name: 'Pro', maxUsers: 20, maxLeads: 500, price: 99.9, createdAt, updatedAt },
      id,
    )

    expect(plan.id.toString()).toBe('plan-123')
    expect(plan.name).toBe('Pro')
    expect(plan.maxUsers).toBe(20)
    expect(plan.maxLeads).toBe(500)
    expect(plan.price).toBe(99.9)
    expect(plan.createdAt).toBe(createdAt)
    expect(plan.updatedAt).toBe(updatedAt)
  })
})
