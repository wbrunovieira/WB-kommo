import { Either, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '@/domain/leads/application/repositories/i-lead-field-config.repository'
import { LeadFieldConfig } from '@/domain/leads/enterprise/entities/lead-field-config.entity'

export class InMemoryLeadFieldConfigRepository implements ILeadFieldConfigRepository {
  items: LeadFieldConfig[] = []

  async findByTenant(tenantId: string): Promise<Either<Error, LeadFieldConfig[]>> {
    return right(this.items.filter(c => c.tenantId === tenantId).sort((a, b) => a.order - b.order))
  }

  async findById(id: string): Promise<Either<Error, LeadFieldConfig | null>> {
    return right(this.items.find(c => c.id.toString() === id) ?? null)
  }

  async findByTenantAndKey(tenantId: string, key: string): Promise<Either<Error, LeadFieldConfig | null>> {
    return right(this.items.find(c => c.tenantId === tenantId && c.key === key) ?? null)
  }

  async save(config: LeadFieldConfig): Promise<Either<Error, void>> {
    const idx = this.items.findIndex(c => c.id.toString() === config.id.toString())
    if (idx >= 0) this.items[idx] = config
    else this.items.push(config)
    return right(undefined)
  }

  async saveMany(configs: LeadFieldConfig[]): Promise<Either<Error, void>> {
    for (const c of configs) await this.save(c)
    return right(undefined)
  }

  async delete(id: string): Promise<Either<Error, void>> {
    this.items = this.items.filter(c => c.id.toString() !== id)
    return right(undefined)
  }
}
