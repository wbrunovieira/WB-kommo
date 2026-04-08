import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ITenantRepository, TenantListItem } from '../../repositories/i-tenant.repository'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface ListTenantsRequest {
  actorRole: RoleType
  actorTenantId: string
}

export type ListTenantsResult = Either<Error, TenantListItem[]>

@Injectable()
export class ListTenantsUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(request: ListTenantsRequest): Promise<ListTenantsResult> {
    if (request.actorRole === 'PLATFORM_OWNER') {
      const result = await this.tenantRepo.findAll()
      if (result.isLeft()) return left(result.value)
      return right(result.value)
    }

    // RESELLER: only their client tenants
    const result = await this.tenantRepo.findClientsByReseller(request.actorTenantId)
    if (result.isLeft()) return left(result.value)
    return right(result.value)
  }
}
