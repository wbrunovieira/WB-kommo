import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export interface TenantProps {
  name: string
  slug: string
  planId: string
  isActive: boolean
  resellerTenantId: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class Tenant extends Entity<TenantProps> {
  private constructor(props: TenantProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<TenantProps, 'name' | 'slug' | 'planId'> & Partial<Pick<TenantProps, 'resellerTenantId'>>,
    id?: UniqueEntityID,
  ): Tenant {
    return new Tenant(
      {
        ...props,
        isActive: true,
        resellerTenantId: props.resellerTenantId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: TenantProps, id: UniqueEntityID): Tenant {
    return new Tenant(props, id)
  }

  get name(): string { return this.props.name }
  get slug(): string { return this.props.slug }
  get planId(): string { return this.props.planId }
  get isActive(): boolean { return this.props.isActive }
  get resellerTenantId(): string | null { return this.props.resellerTenantId }
}
