import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export type FieldType = 'TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE' | 'SELECT'

export interface LeadFieldConfigProps {
  tenantId: string
  key: string
  label: string
  type: FieldType
  isRequired: boolean
  isActive: boolean
  isBuiltin: boolean
  order: number
  options: string[]
  createdAt?: Date
  updatedAt?: Date
}

export class LeadFieldConfig extends Entity<LeadFieldConfigProps> {
  private constructor(props: LeadFieldConfigProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<LeadFieldConfigProps, 'createdAt' | 'updatedAt'>,
    id?: UniqueEntityID,
  ): LeadFieldConfig {
    return new LeadFieldConfig({ ...props, createdAt: new Date(), updatedAt: new Date() }, id)
  }

  static reconstitute(props: LeadFieldConfigProps, id: UniqueEntityID): LeadFieldConfig {
    return new LeadFieldConfig(props, id)
  }

  get tenantId() { return this.props.tenantId }
  get key() { return this.props.key }
  get label() { return this.props.label }
  get type() { return this.props.type }
  get isRequired() { return this.props.isRequired }
  get isActive() { return this.props.isActive }
  get isBuiltin() { return this.props.isBuiltin }
  get order() { return this.props.order }
  get options() { return this.props.options }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }

  update(updates: { label?: string; isRequired?: boolean; isActive?: boolean; order?: number; options?: string[] }): void {
    if (updates.label !== undefined) this.props.label = updates.label
    if (updates.isRequired !== undefined) this.props.isRequired = updates.isRequired
    if (updates.isActive !== undefined) this.props.isActive = updates.isActive
    if (updates.order !== undefined) this.props.order = updates.order
    if (updates.options !== undefined) this.props.options = updates.options
    this.props.updatedAt = new Date()
  }
}
