import { Either, right } from '@/core/errors/either'
import { IPlanRepository } from '@/domain/plans/application/repositories/i-plan.repository'
import { Plan } from '@/domain/plans/enterprise/entities/plan.entity'

export class InMemoryPlanRepository implements IPlanRepository {
  public items: Plan[] = []

  async findById(id: string): Promise<Either<Error, Plan | null>> {
    const plan = this.items.find((p) => p.id.toString() === id)
    return right(plan ?? null)
  }
}
