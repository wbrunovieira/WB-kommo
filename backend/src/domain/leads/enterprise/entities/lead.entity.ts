import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export type LeadStatus = 'OPEN' | 'WON' | 'LOST'

export interface LeadProps {
  tenantId: string
  pipelineId: string
  stageId: string
  name: string
  value?: number
  status: LeadStatus
  assignedToId?: string
  tags: string[]
  customFields?: Record<string, unknown>
  deletedAt?: Date
  deletedByUserId?: string
  createdAt?: Date
  updatedAt?: Date
}

export class Lead extends Entity<LeadProps> {
  private constructor(props: LeadProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<LeadProps, 'status' | 'tags' | 'deletedAt' | 'deletedByUserId' | 'createdAt' | 'updatedAt'> & { tags?: string[] },
    id?: UniqueEntityID,
  ): Lead {
    return new Lead(
      {
        ...props,
        status: 'OPEN',
        tags: props.tags ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: LeadProps, id: UniqueEntityID): Lead {
    return new Lead(props, id)
  }

  // ── getters ───────────────────────────────────────────────────────────────

  get tenantId(): string { return this.props.tenantId }
  get pipelineId(): string { return this.props.pipelineId }
  get stageId(): string { return this.props.stageId }
  get name(): string { return this.props.name }
  get value(): number | undefined { return this.props.value }
  get status(): LeadStatus { return this.props.status }
  get assignedToId(): string | undefined { return this.props.assignedToId }
  get tags(): string[] { return this.props.tags }
  get customFields(): Record<string, unknown> | undefined { return this.props.customFields }
  get deletedAt(): Date | undefined { return this.props.deletedAt }
  get deletedByUserId(): string | undefined { return this.props.deletedByUserId }
  get createdAt(): Date | undefined { return this.props.createdAt }
  get updatedAt(): Date | undefined { return this.props.updatedAt }

  // ── domain methods ────────────────────────────────────────────────────────

  isDeleted(): boolean {
    return !!this.props.deletedAt
  }

  softDelete(byUserId: string): void {
    this.props.deletedAt = new Date()
    this.props.deletedByUserId = byUserId
    this.touch()
  }

  restore(): void {
    this.props.deletedAt = undefined
    this.props.deletedByUserId = undefined
    this.touch()
  }

  rename(name: string): void {
    this.props.name = name
    this.touch()
  }

  updateStage(stageId: string): void {
    this.props.stageId = stageId
    this.touch()
  }

  updatePipeline(pipelineId: string): void {
    this.props.pipelineId = pipelineId
    this.touch()
  }

  updateValue(value: number | undefined): void {
    this.props.value = value
    this.touch()
  }

  markWon(): void {
    this.props.status = 'WON'
    this.touch()
  }

  markLost(): void {
    this.props.status = 'LOST'
    this.touch()
  }

  reopen(): void {
    this.props.status = 'OPEN'
    this.touch()
  }

  assignTo(userId: string): void {
    this.props.assignedToId = userId
    this.touch()
  }

  addTag(tag: string): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags = [...this.props.tags, tag]
      this.touch()
    }
  }

  removeTag(tag: string): void {
    this.props.tags = this.props.tags.filter((t) => t !== tag)
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
