import { Either } from '@/core/errors/either'
import { LeadFieldConfig } from '../../enterprise/entities/lead-field-config.entity'

export abstract class ILeadFieldConfigRepository {
  abstract findByTenant(tenantId: string): Promise<Either<Error, LeadFieldConfig[]>>
  abstract findById(id: string): Promise<Either<Error, LeadFieldConfig | null>>
  abstract findByTenantAndKey(tenantId: string, key: string): Promise<Either<Error, LeadFieldConfig | null>>
  abstract save(config: LeadFieldConfig): Promise<Either<Error, void>>
  abstract saveMany(configs: LeadFieldConfig[]): Promise<Either<Error, void>>
  abstract delete(id: string): Promise<Either<Error, void>>
}
