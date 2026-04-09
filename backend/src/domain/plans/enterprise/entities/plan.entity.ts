import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export interface PlanProps {
  name: string
  maxUsers: number
  maxLeads: number // -1 = unlimited
  price: number
  createdAt?: Date
  updatedAt?: Date
}

export class Plan extends Entity<PlanProps> {
  private constructor(props: PlanProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<PlanProps, 'name' | 'maxUsers' | 'maxLeads' | 'price'>,
    id?: UniqueEntityID,
  ): Plan {
    return new Plan(
      {
        ...props,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: PlanProps, id: UniqueEntityID): Plan {
    return new Plan(props, id)
  }

  get name(): string { return this.props.name }
  get maxUsers(): number { return this.props.maxUsers }
  get maxLeads(): number { return this.props.maxLeads }
  get price(): number { return this.props.price }
  get createdAt(): Date | undefined { return this.props.createdAt }
  get updatedAt(): Date | undefined { return this.props.updatedAt }

  isUnlimited(): boolean {
    return this.props.maxLeads === -1
  }

  hasLeadCapacity(currentCount: number): boolean {
    if (this.isUnlimited()) return true
    return currentCount < this.props.maxLeads
  }
}
