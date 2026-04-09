import { describe, it, expect } from 'vitest'
import { PlanLimitService } from './plan-limit.service'
import { makePlan } from '@/test/factories/make-plan'
import { PlanLimitExceededError } from '../errors/plan-limit-exceeded.error'

describe('PlanLimitService', () => {
  it('returns right(void) when count < maxLeads', () => {
    const plan = makePlan({ maxLeads: 100 })
    const result = PlanLimitService.check(plan, 50)

    expect(result.isRight()).toBe(true)
  })

  it('returns left(PlanLimitExceededError) when count >= maxLeads', () => {
    const plan = makePlan({ maxLeads: 100 })

    const resultEqual = PlanLimitService.check(plan, 100)
    expect(resultEqual.isLeft()).toBe(true)
    expect(resultEqual.value).toBeInstanceOf(PlanLimitExceededError)

    const resultOver = PlanLimitService.check(plan, 150)
    expect(resultOver.isLeft()).toBe(true)
    expect(resultOver.value).toBeInstanceOf(PlanLimitExceededError)
  })

  it('returns right(void) when plan is unlimited (maxLeads === -1)', () => {
    const plan = makePlan({ maxLeads: -1 })
    const result = PlanLimitService.check(plan, 999999)

    expect(result.isRight()).toBe(true)
  })
})
