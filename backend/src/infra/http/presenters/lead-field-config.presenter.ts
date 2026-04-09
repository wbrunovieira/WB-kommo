import { LeadFieldConfig } from '@/domain/leads/enterprise/entities/lead-field-config.entity'

export interface LeadFieldConfigHttpResponse {
  id: string
  tenantId: string
  key: string
  label: string
  type: string
  isRequired: boolean
  isActive: boolean
  isBuiltin: boolean
  order: number
  options: string[]
  createdAt?: Date
  updatedAt?: Date
}

export class LeadFieldConfigPresenter {
  static toHttp(config: LeadFieldConfig): LeadFieldConfigHttpResponse {
    return {
      id: config.id.toString(),
      tenantId: config.tenantId,
      key: config.key,
      label: config.label,
      type: config.type,
      isRequired: config.isRequired,
      isActive: config.isActive,
      isBuiltin: config.isBuiltin,
      order: config.order,
      options: config.options,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }

  static toHttpList(configs: LeadFieldConfig[]): LeadFieldConfigHttpResponse[] {
    return configs.map(LeadFieldConfigPresenter.toHttp)
  }
}
