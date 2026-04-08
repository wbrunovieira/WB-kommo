import { Either, right } from '@/core/errors/either'
import { ITenantRepository, TenantSummary, TenantListItem } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { Tenant } from '@/domain/tenants/enterprise/entities/tenant.entity'

export class InMemoryTenantRepository implements ITenantRepository {
  public items: TenantListItem[] = []
  public savedTenants: Tenant[] = []

  async findBySlug(slug: string): Promise<Either<Error, TenantSummary | null>> {
    const tenant = this.items.find((t) => t.slug === slug)
    return right(tenant ? { id: tenant.id, isActive: tenant.isActive } : null)
  }

  async findClientsByReseller(resellerTenantId: string): Promise<Either<Error, TenantListItem[]>> {
    return right(this.items.filter((t) => t.resellerTenantId === resellerTenantId))
  }

  async findAllResellers(): Promise<Either<Error, TenantListItem[]>> {
    return right(this.items.filter((t) => t.resellerTenantId === null))
  }

  async save(tenant: Tenant): Promise<Either<Error, void>> {
    this.savedTenants.push(tenant)
    this.items.push({
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      resellerTenantId: tenant.resellerTenantId,
    })
    return right(undefined)
  }
}
