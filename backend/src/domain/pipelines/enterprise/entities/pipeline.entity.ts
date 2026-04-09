import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export interface PipelineProps {
  tenantId: string
  name: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Pipeline extends Entity<PipelineProps> {
  private constructor(props: PipelineProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<PipelineProps, 'tenantId' | 'name'>,
    id?: UniqueEntityID,
  ): Pipeline {
    return new Pipeline(
      {
        ...props,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: PipelineProps, id: UniqueEntityID): Pipeline {
    return new Pipeline(props, id)
  }

  get tenantId(): string { return this.props.tenantId }
  get name(): string { return this.props.name }
  get isActive(): boolean { return this.props.isActive }
  get createdAt(): Date | undefined { return this.props.createdAt }
  get updatedAt(): Date | undefined { return this.props.updatedAt }

  rename(name: string): void {
    this.props.name = name
    this.touch()
  }

  deactivate(): void {
    this.props.isActive = false
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
