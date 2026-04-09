import { LeadFieldConfig as PrismaLeadFieldConfig } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { LeadFieldConfig, FieldType } from '@/domain/leads/enterprise/entities/lead-field-config.entity'

export class PrismaLeadFieldConfigMapper {
  static toDomain(raw: PrismaLeadFieldConfig): LeadFieldConfig {
    return LeadFieldConfig.reconstitute(
      {
        tenantId: raw.tenantId,
        key: raw.key,
        label: raw.label,
        type: raw.type as FieldType,
        isRequired: raw.isRequired,
        isActive: raw.isActive,
        isBuiltin: raw.isBuiltin,
        order: raw.order,
        options: raw.options,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(config: LeadFieldConfig) {
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
    }
  }
}
