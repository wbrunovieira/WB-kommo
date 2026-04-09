import { LeadFieldConfig, LeadFieldConfigProps, FieldType } from '@/domain/leads/enterprise/entities/lead-field-config.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export function makeLeadFieldConfig(
  overrides: Partial<LeadFieldConfigProps> = {},
  id?: UniqueEntityID,
): LeadFieldConfig {
  return LeadFieldConfig.create(
    {
      tenantId: 'tenant-1',
      key: 'email',
      label: 'E-mail',
      type: 'EMAIL' as FieldType,
      isRequired: false,
      isActive: true,
      isBuiltin: false,
      order: 0,
      options: [],
      ...overrides,
    },
    id,
  )
}
