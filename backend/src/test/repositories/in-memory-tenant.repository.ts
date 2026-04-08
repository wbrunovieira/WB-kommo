import { Either, right } from '@/core/errors/either'
import { ITenantRepository, TenantSummary, TenantListItem } from '@/domain/tenants/application/repositories/i-tenant.repository'

export class InMemoryTenantRepository implements ITenantRepository {
  public items: TenantListItem[] = []

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
}
