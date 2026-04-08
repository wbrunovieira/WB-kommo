import { Either } from '@/core/errors/either'
import { Tenant } from '../../enterprise/entities/tenant.entity'

export interface TenantSummary {
  id: string
  isActive: boolean
}

export interface TenantListItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  resellerTenantId: string | null
}

export abstract class ITenantRepository {
  abstract findBySlug(slug: string): Promise<Either<Error, TenantSummary | null>>
  abstract findClientsByReseller(resellerTenantId: string): Promise<Either<Error, TenantListItem[]>>
  abstract findAllResellers(): Promise<Either<Error, TenantListItem[]>>
  abstract save(tenant: Tenant): Promise<Either<Error, void>>
}
