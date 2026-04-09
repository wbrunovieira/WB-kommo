import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export interface StageProps {
  pipelineId: string
  name: string
  order: number
  color?: string
  createdAt?: Date
  updatedAt?: Date
}

export class Stage extends Entity<StageProps> {
  private constructor(props: StageProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<StageProps, 'pipelineId' | 'name' | 'order'> & { color?: string },
    id?: UniqueEntityID,
  ): Stage {
    return new Stage(
      {
        ...props,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: StageProps, id: UniqueEntityID): Stage {
    return new Stage(props, id)
  }

  get pipelineId(): string { return this.props.pipelineId }
  get name(): string { return this.props.name }
  get order(): number { return this.props.order }
  get color(): string | undefined { return this.props.color }
  get createdAt(): Date | undefined { return this.props.createdAt }
  get updatedAt(): Date | undefined { return this.props.updatedAt }

  reorder(order: number): void {
    this.props.order = order
    this.touch()
  }

  rename(name: string): void {
    this.props.name = name
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
