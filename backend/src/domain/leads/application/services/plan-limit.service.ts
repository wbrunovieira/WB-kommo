import { Either, left, right } from '@/core/errors/either'
import { Plan } from '@/domain/plans/enterprise/entities/plan.entity'
import { PlanLimitExceededError } from '../errors/plan-limit-exceeded.error'

export class PlanLimitService {
  static check(plan: Plan, currentCount: number): Either<PlanLimitExceededError, void> {
    if (plan.hasLeadCapacity(currentCount)) return right(undefined)
    return left(new PlanLimitExceededError())
  }
}
