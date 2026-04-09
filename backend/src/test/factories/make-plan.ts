import { Plan, PlanProps } from '@/domain/plans/enterprise/entities/plan.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

type FactoryProps = Partial<Pick<PlanProps, 'name' | 'maxUsers' | 'maxLeads' | 'price'>>

export function makePlan(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): Plan {
  return Plan.create(
    {
      name: overrides.name ?? 'Starter',
      maxUsers: overrides.maxUsers ?? 5,
      maxLeads: overrides.maxLeads ?? 100,
      price: overrides.price ?? 49.9,
    },
    id,
  )
}
